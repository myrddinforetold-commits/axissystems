-- Create task status enum
CREATE TYPE task_status AS ENUM ('pending', 'running', 'completed', 'blocked', 'stopped');

-- Create attempt result enum
CREATE TYPE attempt_result AS ENUM ('pass', 'fail', 'unclear');

-- Create tasks table
CREATE TABLE public.tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL,
    title TEXT NOT NULL CHECK (char_length(title) <= 100),
    description TEXT NOT NULL,
    completion_criteria TEXT NOT NULL,
    status task_status NOT NULL DEFAULT 'pending',
    max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts >= 1 AND max_attempts <= 10),
    current_attempt INTEGER NOT NULL DEFAULT 0,
    completion_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_attempts table
CREATE TABLE public.task_attempts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL,
    model_output TEXT NOT NULL,
    evaluation_result attempt_result NOT NULL,
    evaluation_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(task_id, attempt_number)
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Members can view company tasks"
ON public.tasks FOR SELECT
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can create tasks"
ON public.tasks FOR INSERT
WITH CHECK (is_company_member(auth.uid(), company_id) AND auth.uid() = assigned_by);

CREATE POLICY "Members can update task status"
ON public.tasks FOR UPDATE
USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Owners can delete tasks"
ON public.tasks FOR DELETE
USING (is_company_owner(auth.uid(), company_id));

-- RLS policies for task_attempts (read-only for members, insert via service role)
CREATE POLICY "Members can view task attempts"
ON public.task_attempts FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND is_company_member(auth.uid(), t.company_id)
));

-- Trigger for updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_tasks_role_id ON public.tasks(role_id);
CREATE INDEX idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_task_attempts_task_id ON public.task_attempts(task_id);