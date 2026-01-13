## Supabase (Factify)

### 1) Create the database objects

- **Option A (fastest)**: open Supabase **SQL Editor** and run:
  - `supabase/migrations/0001_create_projects.sql`

- **Option B (CLI migrations)**: if you use Supabase CLI in this repo later, you can apply the same migration through `supabase db push` (once the project is linked).

### 2) What was created?

- **`public.projects`**: per-user projects table
- **RLS policies**: users can only select/insert/update/delete their own rows
- **`project_status` enum**: `draft | in_review | paused | complete`

### Next (recommended)

- Storage bucket: `creatives`
- Table: `project_assets` (references `projects.id`, stores file path, type, mime, dimensions, hash)

