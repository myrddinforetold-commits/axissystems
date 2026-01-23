-- Add technical_context column to company_grounding for technical architecture documentation
ALTER TABLE public.company_grounding 
ADD COLUMN technical_context JSONB DEFAULT '{}'::jsonb;