-- Create app_role enum for platform-level roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check app role (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_app_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (has_app_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
USING (has_app_role(auth.uid(), 'admin'));

-- Add admin policies to existing tables

-- Companies: Admins can view all companies
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
USING (has_app_role(auth.uid(), 'admin'));

-- Companies: Admins can delete any company
CREATE POLICY "Admins can delete any company"
ON public.companies
FOR DELETE
USING (has_app_role(auth.uid(), 'admin'));

-- Profiles: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_app_role(auth.uid(), 'admin'));

-- Profiles: Admins can update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
USING (has_app_role(auth.uid(), 'admin'));

-- Access requests: Admins can update status
CREATE POLICY "Admins can update access requests"
ON public.access_requests
FOR UPDATE
USING (has_app_role(auth.uid(), 'admin'));

-- Access requests: Admins can delete requests
CREATE POLICY "Admins can delete access requests"
ON public.access_requests
FOR DELETE
USING (has_app_role(auth.uid(), 'admin'));

-- Company members: Admins can view all members
CREATE POLICY "Admins can view all company members"
ON public.company_members
FOR SELECT
USING (has_app_role(auth.uid(), 'admin'));

-- Company members: Admins can manage all members
CREATE POLICY "Admins can manage all company members"
ON public.company_members
FOR ALL
USING (has_app_role(auth.uid(), 'admin'));