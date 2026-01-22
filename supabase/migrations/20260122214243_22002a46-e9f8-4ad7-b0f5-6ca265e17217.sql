-- Create enum for output action types
CREATE TYPE output_action_type AS ENUM (
  'copy_to_lovable',
  'export_document',
  'create_followup',
  'pin_to_memory',
  'mark_external',
  'delegate_to_human'
);

-- Create output_actions table to track actions taken on completed outputs
CREATE TABLE public.output_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action_type output_action_type NOT NULL,
  action_data JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  completed_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX idx_output_actions_company_id ON public.output_actions(company_id);
CREATE INDEX idx_output_actions_task_id ON public.output_actions(task_id);
CREATE INDEX idx_output_actions_status ON public.output_actions(status);

-- Enable RLS
ALTER TABLE public.output_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view company output actions"
ON public.output_actions
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can insert output actions"
ON public.output_actions
FOR INSERT
WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can update output actions"
ON public.output_actions
FOR UPDATE
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can delete output actions"
ON public.output_actions
FOR DELETE
USING (is_company_owner(auth.uid(), company_id));

-- Trigger for updated_at
CREATE TRIGGER update_output_actions_updated_at
BEFORE UPDATE ON public.output_actions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();