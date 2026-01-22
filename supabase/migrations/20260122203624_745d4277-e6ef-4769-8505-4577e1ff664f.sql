
-- Add system_alert to task_status enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'system_alert';

-- Create dead_letter_queue table for tasks that fail permanently
CREATE TABLE public.dead_letter_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  failure_reason TEXT NOT NULL,
  attempts_made INTEGER NOT NULL,
  last_output TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT
);

-- Enable RLS
ALTER TABLE public.dead_letter_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can view company DLQ"
ON public.dead_letter_queue FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can update DLQ entries"
ON public.dead_letter_queue FOR UPDATE
USING (is_company_owner(auth.uid(), company_id));

CREATE POLICY "Owners can delete DLQ entries"
ON public.dead_letter_queue FOR DELETE
USING (is_company_owner(auth.uid(), company_id));

-- Create index for faster lookups
CREATE INDEX idx_dlq_company_id ON public.dead_letter_queue(company_id);
CREATE INDEX idx_dlq_resolved ON public.dead_letter_queue(resolved_at) WHERE resolved_at IS NULL;
