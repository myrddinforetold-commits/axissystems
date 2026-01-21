-- Create enum for message sender
CREATE TYPE public.message_sender AS ENUM ('user', 'ai');

-- Create role_messages table
CREATE TABLE public.role_messages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sender public.message_sender NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.role_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Members can view messages for their company's roles
CREATE POLICY "Members can view role messages"
ON public.role_messages
FOR SELECT
USING (is_company_member(auth.uid(), company_id));

-- Members can insert messages (both user input and AI responses stored by edge function)
CREATE POLICY "Members can insert role messages"
ON public.role_messages
FOR INSERT
WITH CHECK (is_company_member(auth.uid(), company_id));

-- Add index for efficient queries
CREATE INDEX idx_role_messages_role_id ON public.role_messages(role_id);
CREATE INDEX idx_role_messages_created_at ON public.role_messages(created_at);

-- Add INSERT policy to role_memory for edge function to store memory extracts
CREATE POLICY "Members can insert role memory"
ON public.role_memory
FOR INSERT
WITH CHECK (is_company_member(auth.uid(), company_id));