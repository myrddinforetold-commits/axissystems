-- Create company_context table
CREATE TABLE public.company_context (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'early' CHECK (stage IN ('early', 'growing', 'established')),
  set_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_context ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view company context"
ON public.company_context
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can insert company context"
ON public.company_context
FOR INSERT
WITH CHECK (is_company_owner(auth.uid(), company_id) AND auth.uid() = set_by);

CREATE POLICY "Owners can update company context"
ON public.company_context
FOR UPDATE
USING (is_company_owner(auth.uid(), company_id));

-- Add updated_at trigger
CREATE TRIGGER update_company_context_updated_at
BEFORE UPDATE ON public.company_context
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add task_mode_enabled column to roles table
ALTER TABLE public.roles ADD COLUMN task_mode_enabled BOOLEAN NOT NULL DEFAULT false;