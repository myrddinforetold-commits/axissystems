-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view invitation by token" ON public.company_invitations;

-- Create a more secure function for token-based access
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(_token uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  email text,
  role text,
  status text,
  expires_at timestamptz,
  company_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    i.id,
    i.company_id,
    i.email,
    i.role,
    i.status,
    i.expires_at,
    c.name as company_name
  FROM public.company_invitations i
  JOIN public.companies c ON c.id = i.company_id
  WHERE i.token = _token
    AND i.status = 'pending'
    AND i.expires_at > now()
$$;

-- Create a function to accept invitations
CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  invitation_record RECORD;
BEGIN
  -- Get the invitation
  SELECT * INTO invitation_record
  FROM public.company_invitations
  WHERE token = _token
    AND status = 'pending'
    AND expires_at > now();
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if user email matches invitation email
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != invitation_record.email THEN
    RETURN false;
  END IF;
  
  -- Add user to company
  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (
    invitation_record.company_id, 
    auth.uid(), 
    invitation_record.role::company_role
  )
  ON CONFLICT (company_id, user_id) DO NOTHING;
  
  -- Mark invitation as accepted
  UPDATE public.company_invitations
  SET status = 'accepted'
  WHERE id = invitation_record.id;
  
  RETURN true;
END;
$$;