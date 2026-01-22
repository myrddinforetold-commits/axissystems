-- Create company_grounding table for storing grounding phase data
CREATE TABLE public.company_grounding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  
  -- Grounding Data (Structured Facts)
  products JSONB NOT NULL DEFAULT '[]',
  entities JSONB NOT NULL DEFAULT '[]',
  not_yet_exists JSONB NOT NULL DEFAULT '[]',
  aspirations JSONB NOT NULL DEFAULT '[]',
  intended_customer TEXT,
  constraints JSONB NOT NULL DEFAULT '[]',
  
  -- Generated Summary
  current_state_summary JSONB,
  
  -- Status: 'in_progress' | 'pending_confirmation' | 'confirmed'
  status TEXT NOT NULL DEFAULT 'in_progress',
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add is_grounded column to company_context
ALTER TABLE public.company_context 
ADD COLUMN is_grounded BOOLEAN NOT NULL DEFAULT FALSE;

-- Enable RLS
ALTER TABLE public.company_grounding ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_grounding
CREATE POLICY "Members can view company grounding"
ON public.company_grounding FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can insert company grounding"
ON public.company_grounding FOR INSERT
WITH CHECK (is_company_owner(auth.uid(), company_id));

CREATE POLICY "Owners can update company grounding"
ON public.company_grounding FOR UPDATE
USING (is_company_owner(auth.uid(), company_id));

-- Trigger for updated_at
CREATE TRIGGER update_company_grounding_updated_at
BEFORE UPDATE ON public.company_grounding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();