-- Add orchestrator to authority_level enum
ALTER TYPE public.authority_level ADD VALUE IF NOT EXISTS 'orchestrator';

-- Create cos_reports table for storing generated summaries
CREATE TABLE public.cos_reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    report_type TEXT NOT NULL,
    content TEXT NOT NULL,
    generated_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.cos_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Members can view company reports"
ON public.cos_reports
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can create reports"
ON public.cos_reports
FOR INSERT
WITH CHECK (is_company_member(auth.uid(), company_id) AND auth.uid() = generated_by);

CREATE POLICY "Owners can delete reports"
ON public.cos_reports
FOR DELETE
USING (is_company_owner(auth.uid(), company_id));

-- Index for efficient querying
CREATE INDEX idx_cos_reports_company_id ON public.cos_reports(company_id);
CREATE INDEX idx_cos_reports_role_id ON public.cos_reports(role_id);
CREATE INDEX idx_cos_reports_created_at ON public.cos_reports(created_at DESC);