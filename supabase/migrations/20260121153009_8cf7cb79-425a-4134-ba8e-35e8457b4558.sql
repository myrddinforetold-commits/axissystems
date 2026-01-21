-- Drop the permissive policy
DROP POLICY "Authenticated users can create companies" ON public.companies;

-- Create a function that inserts a company and returns its ID, then adds the creator as owner
-- This ensures atomic creation with owner assignment
CREATE OR REPLACE FUNCTION public.create_company_with_owner(company_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_company_id UUID;
BEGIN
    -- Insert the company
    INSERT INTO public.companies (name)
    VALUES (company_name)
    RETURNING id INTO new_company_id;
    
    -- Add the creator as owner
    INSERT INTO public.company_members (company_id, user_id, role)
    VALUES (new_company_id, auth.uid(), 'owner');
    
    RETURN new_company_id;
END;
$$;