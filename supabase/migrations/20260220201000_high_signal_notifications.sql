-- High-signal notifications only:
-- 1) Notify owners only for review_output workflow requests.
-- 2) Notify owners for blocked/system_alert task states.
-- 3) Notify assigner on completed tasks only when verification is required.

CREATE OR REPLACE FUNCTION public.notify_workflow_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_record RECORD;
  role_name TEXT;
BEGIN
  -- Suppress low-signal workflow notifications (auto-approved internal transitions).
  IF NEW.request_type::TEXT <> 'review_output' THEN
    RETURN NEW;
  END IF;

  -- Notify only pending review requests.
  IF NEW.status::TEXT <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO role_name FROM public.roles WHERE id = NEW.requesting_role_id;

  FOR owner_record IN
    SELECT cm.user_id
    FROM public.company_members cm
    WHERE cm.company_id = NEW.company_id AND cm.role = 'owner'
  LOOP
    INSERT INTO public.notifications (user_id, company_id, type, title, message, link)
    VALUES (
      owner_record.user_id,
      NEW.company_id,
      'workflow_request',
      'Review Required',
      COALESCE(role_name, 'A role') || ' submitted output for review: ' || LEFT(NEW.summary, 120),
      '/companies/' || NEW.company_id::TEXT || '?tab=workflow&request=' || NEW.id::TEXT || '&workflowView=pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name TEXT;
  owner_record RECORD;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO role_name FROM public.roles WHERE id = NEW.role_id;

  -- High-priority alerts: blocked/system_alert should always notify owners.
  IF NEW.status::TEXT IN ('blocked', 'system_alert') THEN
    FOR owner_record IN
      SELECT cm.user_id
      FROM public.company_members cm
      WHERE cm.company_id = NEW.company_id AND cm.role = 'owner'
    LOOP
      INSERT INTO public.notifications (user_id, company_id, type, title, message, link)
      VALUES (
        owner_record.user_id,
        NEW.company_id,
        'system_alert',
        'Task Needs Attention',
        COALESCE(role_name, 'A role') || ' task requires intervention: ' || NEW.title,
        '/companies/' || NEW.company_id::TEXT || '/roles/' || NEW.role_id::TEXT || '/chat'
      );
    END LOOP;

    RETURN NEW;
  END IF;

  -- Completion is only notified when explicit human verification is required.
  IF NEW.status::TEXT = 'completed'
    AND COALESCE(NEW.requires_verification, false)
    AND NEW.assigned_by IS NOT NULL
  THEN
    INSERT INTO public.notifications (user_id, company_id, type, title, message, link)
    VALUES (
      NEW.assigned_by,
      NEW.company_id,
      'task_completed',
      'Output Ready for Verification',
      COALESCE(role_name, 'A role') || ' completed: ' || NEW.title,
      '/companies/' || NEW.company_id::TEXT || '/roles/' || NEW.role_id::TEXT || '/chat'
    );
  END IF;

  RETURN NEW;
END;
$$;
