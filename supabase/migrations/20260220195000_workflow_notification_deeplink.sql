-- Route workflow notifications directly into the Workflow tab and targeted request.
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
  -- Get the role name
  SELECT name INTO role_name FROM public.roles WHERE id = NEW.requesting_role_id;

  -- Notify all company owners
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
      'New Approval Request',
      COALESCE(role_name, 'A role') || ' is requesting approval: ' || LEFT(NEW.summary, 100),
      '/companies/' || NEW.company_id::TEXT || '?tab=workflow&request=' || NEW.id::TEXT || '&workflowView=pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$;
