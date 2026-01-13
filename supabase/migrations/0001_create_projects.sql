-- Factify: Projects table (Phase-aware creative compliance projects)
-- Apply in Supabase SQL editor, or via Supabase CLI migrations.

-- Extensions (safe if already enabled)
create extension if not exists "pgcrypto";

-- Optional: keep updated_at in sync
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Status enum (keeps UI simple + consistent)
do $$
begin
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type public.project_status as enum ('draft', 'in_review', 'paused', 'complete');
  end if;
end$$;

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),

  -- Ownership (ties to Supabase Auth)
  owner_id uuid not null references auth.users(id) on delete cascade,

  -- Core
  name text not null check (char_length(name) between 1 and 140),
  status public.project_status not null default 'draft',

  -- Phase / progress (UI-driven for now; later derived from workflow state)
  active_phase text not null default 'setup',
  progress_pct integer not null default 0 check (progress_pct between 0 and 100),

  -- Flexible metadata for later (channels, brief, extracted brand assets pointers, etc.)
  meta jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_projects_set_updated_at on public.projects;
create trigger trg_projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

-- Helpful indexes
create index if not exists projects_owner_id_idx on public.projects(owner_id);
create index if not exists projects_owner_updated_at_idx on public.projects(owner_id, updated_at desc);
create index if not exists projects_status_idx on public.projects(status);

-- Row Level Security (owner-only)
alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
on public.projects
for select
using (auth.uid() = owner_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects
for insert
with check (auth.uid() = owner_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
on public.projects
for update
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
on public.projects
for delete
using (auth.uid() = owner_id);

