-- Update the trigger to allow system_prompt updates
CREATE OR REPLACE FUNCTION public.enforce_role_immutability()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Allow mandate, display_name, and system_prompt to change
    IF NEW.name <> OLD.name OR
       NEW.authority_level <> OLD.authority_level OR
       NEW.memory_scope <> OLD.memory_scope OR
       NEW.company_id <> OLD.company_id OR
       NEW.created_by <> OLD.created_by OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Only mandate, display_name, and system_prompt can be updated after role creation';
    END IF;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;