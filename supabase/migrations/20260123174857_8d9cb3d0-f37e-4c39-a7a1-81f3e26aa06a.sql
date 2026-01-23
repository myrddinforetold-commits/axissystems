-- Create platform_settings table for admin-configurable settings
CREATE TABLE public.platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Admins can read/update all settings
CREATE POLICY "Admins can view all platform settings"
  ON public.platform_settings
  FOR SELECT
  USING (has_app_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update platform settings"
  ON public.platform_settings
  FOR UPDATE
  USING (has_app_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert platform settings"
  ON public.platform_settings
  FOR INSERT
  WITH CHECK (has_app_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can read (for maintenance mode check)
CREATE POLICY "Authenticated users can read maintenance mode"
  ON public.platform_settings
  FOR SELECT
  USING (auth.uid() IS NOT NULL AND key = 'maintenance_mode');

-- Insert default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('allow_signups', 'true'),
  ('require_email_verification', 'false'),
  ('maintenance_mode', 'false'),
  ('feature_ai_task_execution', 'true'),
  ('feature_cos_reports', 'true'),
  ('feature_company_memory', 'true');

-- Create trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();