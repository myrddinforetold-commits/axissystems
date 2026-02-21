-- Founder notifications should only surface workflow approvals initiated by governance roles
-- (CEO / Chief of Staff / executive-orchestrator authority).

CREATE OR REPLACE FUNCTION public.notify_workflow_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_record RECORD;
  role_name TEXT;
  role_display_name TEXT;
  role_authority TEXT;
  role_label TEXT;
  is_governance BOOLEAN := false;
BEGIN
  -- Keep workflow notifications high-signal and review-oriented.
  IF NEW.request_type::TEXT <> 'review_output' THEN
    RETURN NEW;
  END IF;

  IF NEW.status::TEXT <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT r.name, r.display_name, r.authority_level::TEXT
  INTO role_name, role_display_name, role_authority
  FROM public.roles r
  WHERE r.id = NEW.requesting_role_id;

  role_label := lower(coalesce(role_display_name, '') || ' ' || coalesce(role_name, ''));
  is_governance :=
    role_authority IN ('executive', 'orchestrator')
    OR role_label LIKE '%ceo%'
    OR role_label LIKE '%chief of staff%';

  IF NOT is_governance THEN
    RETURN NEW;
  END IF;

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
      COALESCE(role_display_name, role_name, 'A governance role') || ' submitted output for review: ' || LEFT(NEW.summary, 120),
      '/companies/' || NEW.company_id::TEXT || '?tab=workflow&request=' || NEW.id::TEXT || '&workflowView=pending'
    );
  END LOOP;

  RETURN NEW;
END;
$$;
