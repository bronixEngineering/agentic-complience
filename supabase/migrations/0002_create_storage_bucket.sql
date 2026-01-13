-- Factify: Storage bucket for project content (images, videos, documents)
-- Apply in Supabase SQL editor, or via Supabase CLI migrations.

-- Create storage bucket for project content
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-content',
  'project-content',
  false, -- Private bucket
  52428800, -- 50MB limit
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf', 'text/plain']
)
on conflict (id) do nothing;

-- Helper function to extract user ID from path (format: {userId}/{projectId}/{filename})
create or replace function get_user_id_from_path(path text)
returns uuid
language plpgsql
security definer
as $$
declare
  path_parts text[];
begin
  path_parts := string_to_array(trim(both '/' from path), '/');
  if array_length(path_parts, 1) >= 1 then
    return path_parts[1]::uuid;
  end if;
  return null;
end;
$$;

-- Helper function to check if user owns the project
create or replace function user_owns_project(project_id uuid)
returns boolean
language plpgsql
security definer
as $$
begin
  return exists (
    select 1
    from public.projects
    where id = project_id
    and owner_id = auth.uid()
  );
end;
$$;

-- RLS Policy: Users can only upload to their own project folders
-- Path format: {userId}/{projectId}/{filename}
create policy "Users can upload to their own projects"
on storage.objects
for insert
with check (
  bucket_id = 'project-content' and
  get_user_id_from_path(name) = auth.uid() and
  user_owns_project(
    (string_to_array(trim(both '/' from name), '/'))[2]::uuid
  )
);

-- RLS Policy: Users can view files from their own projects
create policy "Users can view their own project files"
on storage.objects
for select
using (
  bucket_id = 'project-content' and
  get_user_id_from_path(name) = auth.uid() and
  user_owns_project(
    (string_to_array(trim(both '/' from name), '/'))[2]::uuid
  )
);

-- RLS Policy: Users can update files in their own projects
create policy "Users can update their own project files"
on storage.objects
for update
using (
  bucket_id = 'project-content' and
  get_user_id_from_path(name) = auth.uid() and
  user_owns_project(
    (string_to_array(trim(both '/' from name), '/'))[2]::uuid
  )
)
with check (
  bucket_id = 'project-content' and
  get_user_id_from_path(name) = auth.uid() and
  user_owns_project(
    (string_to_array(trim(both '/' from name), '/'))[2]::uuid
  )
);

-- RLS Policy: Users can delete files from their own projects
create policy "Users can delete their own project files"
on storage.objects
for delete
using (
  bucket_id = 'project-content' and
  get_user_id_from_path(name) = auth.uid() and
  user_owns_project(
    (string_to_array(trim(both '/' from name), '/'))[2]::uuid
  )
);
