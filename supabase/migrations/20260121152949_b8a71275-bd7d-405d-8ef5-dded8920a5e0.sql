-- Create role enum for company members
CREATE TYPE public.company_role AS ENUM ('owner', 'member');

-- Create profiles table for user data
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create companies table
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_members table (junction table with roles)
CREATE TABLE public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.company_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(company_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user is member of a company
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.company_members
        WHERE user_id = _user_id
          AND company_id = _company_id
    )
$$;

-- Security definer function to check if user is owner of a company
CREATE OR REPLACE FUNCTION public.is_company_owner(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.company_members
        WHERE user_id = _user_id
          AND company_id = _company_id
          AND role = 'owner'
    )
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- RLS Policies for companies
CREATE POLICY "Members can view their companies"
    ON public.companies FOR SELECT
    TO authenticated
    USING (public.is_company_member(auth.uid(), id));

CREATE POLICY "Authenticated users can create companies"
    ON public.companies FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Owners can update their companies"
    ON public.companies FOR UPDATE
    TO authenticated
    USING (public.is_company_owner(auth.uid(), id));

CREATE POLICY "Owners can delete their companies"
    ON public.companies FOR DELETE
    TO authenticated
    USING (public.is_company_owner(auth.uid(), id));

-- RLS Policies for company_members
CREATE POLICY "Members can view company members"
    ON public.company_members FOR SELECT
    TO authenticated
    USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Authenticated users can join as owner on insert"
    ON public.company_members FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can manage members"
    ON public.company_members FOR DELETE
    TO authenticated
    USING (public.is_company_owner(auth.uid(), company_id));

-- Trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger for profiles updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_company_members_user_id ON public.company_members(user_id);
CREATE INDEX idx_company_members_company_id ON public.company_members(company_id);