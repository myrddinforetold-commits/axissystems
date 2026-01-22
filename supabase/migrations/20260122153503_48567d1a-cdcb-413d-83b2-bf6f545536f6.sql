-- Create role_objectives table for persistent role goals
CREATE TABLE public.role_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL
);

-- Enable RLS
ALTER TABLE public.role_objectives ENABLE ROW LEVEL SECURITY;

-- Members can view objectives
CREATE POLICY "Members can view role objectives"
  ON public.role_objectives
  FOR SELECT
  USING (is_company_member(auth.uid(), company_id));

-- Owners can insert objectives
CREATE POLICY "Owners can insert role objectives"
  ON public.role_objectives
  FOR INSERT
  WITH CHECK (is_company_owner(auth.uid(), company_id) AND auth.uid() = created_by);

-- Owners can update objectives
CREATE POLICY "Owners can update role objectives"
  ON public.role_objectives
  FOR UPDATE
  USING (is_company_owner(auth.uid(), company_id));

-- Owners can delete objectives
CREATE POLICY "Owners can delete role objectives"
  ON public.role_objectives
  FOR DELETE
  USING (is_company_owner(auth.uid(), company_id));

-- Create trigger for updated_at
CREATE TRIGGER update_role_objectives_updated_at
  BEFORE UPDATE ON public.role_objectives
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Remove task_mode_enabled column (autonomy is always on)
ALTER TABLE public.roles DROP COLUMN IF EXISTS task_mode_enabled;