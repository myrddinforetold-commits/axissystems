-- Add display_name column to roles table
ALTER TABLE public.roles 
ADD COLUMN display_name text;

-- Drop the existing trigger
DROP TRIGGER IF EXISTS enforce_role_immutability_trigger ON public.roles;

-- Update the immutability function to allow display_name changes
CREATE OR REPLACE FUNCTION public.enforce_role_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Allow mandate and display_name to change, block everything else
    IF NEW.name <> OLD.name OR
       NEW.system_prompt <> OLD.system_prompt OR
       NEW.authority_level <> OLD.authority_level OR
       NEW.memory_scope <> OLD.memory_scope OR
       NEW.company_id <> OLD.company_id OR
       NEW.created_by <> OLD.created_by OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Only mandate and display_name can be updated after role creation';
    END IF;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER enforce_role_immutability_trigger
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_immutability();

-- Create company_invitations table for invite system
CREATE TABLE public.company_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  invited_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE(company_id, email)
);

-- Enable RLS on company_invitations
ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_invitations
CREATE POLICY "Members can view company invitations"
ON public.company_invitations FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can create invitations"
ON public.company_invitations FOR INSERT
WITH CHECK (is_company_owner(auth.uid(), company_id) AND auth.uid() = invited_by);

CREATE POLICY "Owners can update invitations"
ON public.company_invitations FOR UPDATE
USING (is_company_owner(auth.uid(), company_id));

CREATE POLICY "Owners can delete invitations"
ON public.company_invitations FOR DELETE
USING (is_company_owner(auth.uid(), company_id));

-- Allow anyone to view invitation by token (for accepting invites)
CREATE POLICY "Anyone can view invitation by token"
ON public.company_invitations FOR SELECT
USING (true);