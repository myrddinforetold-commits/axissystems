-- Create enum for workflow request types
CREATE TYPE public.workflow_request_type AS ENUM (
  'send_memo',
  'start_task',
  'continue_task',
  'suggest_next_task'
);

-- Create enum for workflow request status
CREATE TYPE public.workflow_request_status AS ENUM (
  'pending',
  'approved',
  'denied'
);

-- Create workflow_requests table
CREATE TABLE public.workflow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  requesting_role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  target_role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
  request_type public.workflow_request_type NOT NULL,
  summary TEXT NOT NULL,
  proposed_content TEXT NOT NULL,
  status public.workflow_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  source_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create role_memos table for delivered memos
CREATE TABLE public.role_memos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  from_role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  to_role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  workflow_request_id UUID NOT NULL REFERENCES public.workflow_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add workflow_status column to roles table
ALTER TABLE public.roles ADD COLUMN workflow_status TEXT NOT NULL DEFAULT 'idle';

-- Enable RLS on workflow_requests
ALTER TABLE public.workflow_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for workflow_requests
CREATE POLICY "Members can view company workflow requests"
ON public.workflow_requests
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can update workflow requests"
ON public.workflow_requests
FOR UPDATE
USING (is_company_owner(auth.uid(), company_id));

CREATE POLICY "Admins can view all workflow requests"
ON public.workflow_requests
FOR SELECT
USING (has_app_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all workflow requests"
ON public.workflow_requests
FOR UPDATE
USING (has_app_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on role_memos
ALTER TABLE public.role_memos ENABLE ROW LEVEL SECURITY;

-- RLS policies for role_memos
CREATE POLICY "Members can view company memos"
ON public.role_memos
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can delete company memos"
ON public.role_memos
FOR DELETE
USING (is_company_owner(auth.uid(), company_id));

-- Create index for faster queries
CREATE INDEX idx_workflow_requests_company_status ON public.workflow_requests(company_id, status);
CREATE INDEX idx_workflow_requests_requesting_role ON public.workflow_requests(requesting_role_id);
CREATE INDEX idx_role_memos_to_role ON public.role_memos(to_role_id);

-- Enable realtime for workflow_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_requests;

-- Create function to update role workflow_status based on pending requests
CREATE OR REPLACE FUNCTION public.update_role_workflow_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role_id UUID;
  _has_pending BOOLEAN;
  _has_active_task BOOLEAN;
BEGIN
  -- Determine which role to update
  IF TG_OP = 'DELETE' THEN
    _role_id := OLD.requesting_role_id;
  ELSE
    _role_id := NEW.requesting_role_id;
  END IF;

  -- Check for pending requests
  SELECT EXISTS (
    SELECT 1 FROM public.workflow_requests
    WHERE requesting_role_id = _role_id AND status = 'pending'
  ) INTO _has_pending;

  -- Check for active tasks
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE role_id = _role_id AND status IN ('pending', 'running')
  ) INTO _has_active_task;

  -- Update role status
  UPDATE public.roles
  SET workflow_status = CASE
    WHEN _has_pending THEN 'awaiting_approval'
    WHEN _has_active_task THEN 'in_task'
    ELSE 'idle'
  END
  WHERE id = _role_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for workflow_requests changes
CREATE TRIGGER trg_update_role_workflow_status
AFTER INSERT OR UPDATE OF status OR DELETE ON public.workflow_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_role_workflow_status();

-- Also update on task status changes
CREATE OR REPLACE FUNCTION public.update_role_workflow_status_on_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role_id UUID;
  _has_pending BOOLEAN;
  _has_active_task BOOLEAN;
BEGIN
  -- Determine which role to update
  IF TG_OP = 'DELETE' THEN
    _role_id := OLD.role_id;
  ELSE
    _role_id := NEW.role_id;
  END IF;

  -- Check for pending requests
  SELECT EXISTS (
    SELECT 1 FROM public.workflow_requests
    WHERE requesting_role_id = _role_id AND status = 'pending'
  ) INTO _has_pending;

  -- Check for active tasks
  SELECT EXISTS (
    SELECT 1 FROM public.tasks
    WHERE role_id = _role_id AND status IN ('pending', 'running')
  ) INTO _has_active_task;

  -- Update role status
  UPDATE public.roles
  SET workflow_status = CASE
    WHEN _has_pending THEN 'awaiting_approval'
    WHEN _has_active_task THEN 'in_task'
    ELSE 'idle'
  END
  WHERE id = _role_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_role_workflow_status_on_task
AFTER INSERT OR UPDATE OF status OR DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_role_workflow_status_on_task();