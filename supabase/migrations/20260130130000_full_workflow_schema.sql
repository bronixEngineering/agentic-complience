-- Master Migration for Creative Workflow (Re-creation)

-- 1. Project Brief Versions
CREATE TABLE IF NOT EXISTS public.project_brief_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  
  version_number integer NOT NULL,
  
  user_brief_text text NOT NULL,
  enhanced_brief_json jsonb,
  
  is_approved boolean DEFAULT NULL,
  feedback_notes text,
  
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  UNIQUE(project_id, version_number)
);

ALTER TABLE public.project_brief_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view brief versions of their own projects" ON public.project_brief_versions
      FOR SELECT USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_brief_versions.project_id AND owner_id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert brief versions to their own projects" ON public.project_brief_versions
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_brief_versions.project_id AND owner_id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can update brief versions of their own projects" ON public.project_brief_versions
      FOR UPDATE USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_brief_versions.project_id AND owner_id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 2. Workflow Executions
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  volt_execution_id text, 
  brief_version_id uuid REFERENCES public.project_brief_versions(id),
  status text NOT NULL DEFAULT 'running',
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone
);

ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view executions of their own projects" ON public.workflow_executions
      FOR SELECT USING (EXISTS (SELECT 1 FROM public.projects WHERE id = workflow_executions.project_id AND owner_id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert executions to their own projects" ON public.workflow_executions
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = workflow_executions.project_id AND owner_id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 3. Workflow Steps
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  execution_id uuid REFERENCES public.workflow_executions(id) ON DELETE CASCADE NOT NULL,
  
  step_name text NOT NULL,
  agent_id text NOT NULL,
  input_payload jsonb,
  output_payload jsonb,
  status text NOT NULL,
  error_message text,
  
  started_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at timestamp with time zone
);

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view steps of their own projects" ON public.workflow_steps
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM public.workflow_executions 
          JOIN public.projects ON public.projects.id = public.workflow_executions.project_id
          WHERE public.workflow_executions.id = workflow_steps.execution_id 
          AND public.projects.owner_id = auth.uid()
        )
      );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;


-- 4. Project Content Table (Ensure it exists and has columns)
CREATE TABLE IF NOT EXISTS public.project_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  content_type text NOT NULL,
  content_data jsonb NOT NULL,
  agent_id text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.project_content ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can view content of their own projects" ON public.project_content
      FOR SELECT USING (EXISTS (SELECT 1 FROM public.projects WHERE id = project_content.project_id AND owner_id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE POLICY "Users can insert content to their own projects" ON public.project_content
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.projects WHERE id = project_content.project_id AND owner_id = auth.uid()));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add linking columns if not exist
ALTER TABLE public.project_content ADD COLUMN IF NOT EXISTS execution_id uuid REFERENCES public.workflow_executions(id) ON DELETE SET NULL;
ALTER TABLE public.project_content ADD COLUMN IF NOT EXISTS step_id uuid REFERENCES public.workflow_steps(id) ON DELETE SET NULL;
