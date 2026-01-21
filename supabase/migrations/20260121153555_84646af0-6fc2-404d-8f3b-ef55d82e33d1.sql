-- Create authority_level enum (unused for now, prepared for future)
CREATE TYPE authority_level AS ENUM ('observer', 'advisor', 'operator', 'executive');

-- Create memory_scope enum
CREATE TYPE memory_scope AS ENUM ('role', 'company');

-- Create roles table
CREATE TABLE public.roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    mandate TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    authority_level authority_level NOT NULL DEFAULT 'advisor',
    memory_scope memory_scope NOT NULL DEFAULT 'role',
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create role_memory table (prepared, not used yet)
CREATE TABLE public.role_memory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    memory_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_memory ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles table

-- Members can view roles in their company
CREATE POLICY "Members can view company roles"
ON public.roles
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

-- Only owners can create roles
CREATE POLICY "Owners can create roles"
ON public.roles
FOR INSERT
WITH CHECK (is_company_owner(auth.uid(), company_id));

-- Only owners can update, and only mandate field (enforced via trigger below)
CREATE POLICY "Owners can update roles"
ON public.roles
FOR UPDATE
USING (is_company_owner(auth.uid(), company_id));

-- Only owners can delete roles
CREATE POLICY "Owners can delete roles"
ON public.roles
FOR DELETE
USING (is_company_owner(auth.uid(), company_id));

-- RLS Policies for role_memory table (locked down for now)

-- Members can view role memories for their company
CREATE POLICY "Members can view role memories"
ON public.role_memory
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

-- No INSERT/UPDATE/DELETE policies for role_memory (locked for future)

-- Create trigger to enforce immutability (only mandate can change)
CREATE OR REPLACE FUNCTION public.enforce_role_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only allow mandate and updated_at to change
    IF NEW.name <> OLD.name OR
       NEW.system_prompt <> OLD.system_prompt OR
       NEW.authority_level <> OLD.authority_level OR
       NEW.memory_scope <> OLD.memory_scope OR
       NEW.company_id <> OLD.company_id OR
       NEW.created_by <> OLD.created_by OR
       NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Only mandate can be updated after role creation';
    END IF;
    
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_role_immutability_trigger
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.enforce_role_immutability();

-- Add indexes for performance
CREATE INDEX idx_roles_company_id ON public.roles(company_id);
CREATE INDEX idx_role_memory_role_id ON public.role_memory(role_id);
CREATE INDEX idx_role_memory_company_id ON public.role_memory(company_id);