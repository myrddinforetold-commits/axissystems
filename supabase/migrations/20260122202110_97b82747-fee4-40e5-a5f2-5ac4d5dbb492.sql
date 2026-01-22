-- Add 'archived' status to task_status enum
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'archived';

-- Add verification columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS requires_verification BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES auth.users(id);

-- Create a function to cleanup old workflow requests
CREATE OR REPLACE FUNCTION public.cleanup_old_workflow_requests(days_old INTEGER DEFAULT 7)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM workflow_requests
    WHERE status = 'pending' 
    AND created_at < NOW() - INTERVAL '1 day' * days_old
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  RETURN deleted_count;
END;
$$;