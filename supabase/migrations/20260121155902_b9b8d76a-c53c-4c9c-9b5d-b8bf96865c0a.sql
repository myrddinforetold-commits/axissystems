-- Create company_memory table for shared memories across roles
CREATE TABLE public.company_memory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    source_message_id UUID REFERENCES public.role_messages(id) ON DELETE SET NULL,
    source_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    pinned_by UUID NOT NULL,
    label TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.company_memory ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company_memory
CREATE POLICY "Members can view company memories"
ON public.company_memory
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can insert company memories"
ON public.company_memory
FOR INSERT
WITH CHECK (is_company_member(auth.uid(), company_id) AND auth.uid() = pinned_by);

CREATE POLICY "Owners can delete company memories"
ON public.company_memory
FOR DELETE
USING (is_company_owner(auth.uid(), company_id));

-- Create indexes for efficient querying
CREATE INDEX idx_company_memory_company_id ON public.company_memory(company_id);
CREATE INDEX idx_company_memory_created_at ON public.company_memory(created_at DESC);