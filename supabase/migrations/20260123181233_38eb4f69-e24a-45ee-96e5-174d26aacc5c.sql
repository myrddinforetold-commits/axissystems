-- Create notifications table for in-app notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('workflow_request', 'task_completed', 'invitation', 'memo_received', 'objective_complete', 'system_alert')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- System can insert notifications (via service role in edge functions)
-- For triggers, we need a function that uses SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_notification(
  _user_id UUID,
  _company_id UUID,
  _type TEXT,
  _title TEXT,
  _message TEXT,
  _link TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, company_id, type, title, message, link)
  VALUES (_user_id, _company_id, _type, _title, _message, _link)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Trigger function to notify owners when workflow request is created
CREATE OR REPLACE FUNCTION public.notify_workflow_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_record RECORD;
  role_name TEXT;
BEGIN
  -- Get the role name
  SELECT name INTO role_name FROM public.roles WHERE id = NEW.requesting_role_id;
  
  -- Notify all company owners
  FOR owner_record IN 
    SELECT cm.user_id 
    FROM public.company_members cm 
    WHERE cm.company_id = NEW.company_id AND cm.role = 'owner'
  LOOP
    INSERT INTO public.notifications (user_id, company_id, type, title, message, link)
    VALUES (
      owner_record.user_id,
      NEW.company_id,
      'workflow_request',
      'New Approval Request',
      COALESCE(role_name, 'A role') || ' is requesting approval: ' || LEFT(NEW.summary, 100),
      '/companies/' || NEW.company_id::TEXT
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Trigger function to notify when task is completed
CREATE OR REPLACE FUNCTION public.notify_task_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  role_name TEXT;
BEGIN
  -- Only trigger on status change to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get the role name
    SELECT name INTO role_name FROM public.roles WHERE id = NEW.role_id;
    
    -- Notify the task assigner
    INSERT INTO public.notifications (user_id, company_id, type, title, message, link)
    VALUES (
      NEW.assigned_by,
      NEW.company_id,
      'task_completed',
      'Task Completed',
      COALESCE(role_name, 'A role') || ' completed: ' || NEW.title,
      '/companies/' || NEW.company_id::TEXT || '/roles/' || NEW.role_id::TEXT || '/chat'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_workflow_request_created
  AFTER INSERT ON public.workflow_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_workflow_request();

CREATE TRIGGER on_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_completed();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;