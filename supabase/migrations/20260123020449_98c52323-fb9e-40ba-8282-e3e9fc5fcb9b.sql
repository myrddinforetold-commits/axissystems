-- Create company_webhooks table for storing webhook configurations
CREATE TABLE public.company_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT,
  event_types TEXT[] DEFAULT ARRAY['mark_external'],
  is_active BOOLEAN DEFAULT true,
  headers JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create webhook_deliveries table for tracking delivery attempts
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.company_webhooks(id) ON DELETE CASCADE,
  output_action_id UUID REFERENCES public.output_actions(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.company_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_webhooks - owners only
CREATE POLICY "Owners can view company webhooks"
  ON public.company_webhooks FOR SELECT
  USING (public.is_company_owner(auth.uid(), company_id));

CREATE POLICY "Owners can create webhooks"
  ON public.company_webhooks FOR INSERT
  WITH CHECK (public.is_company_owner(auth.uid(), company_id) AND auth.uid() = created_by);

CREATE POLICY "Owners can update webhooks"
  ON public.company_webhooks FOR UPDATE
  USING (public.is_company_owner(auth.uid(), company_id));

CREATE POLICY "Owners can delete webhooks"
  ON public.company_webhooks FOR DELETE
  USING (public.is_company_owner(auth.uid(), company_id));

-- RLS policies for webhook_deliveries - owners only
CREATE POLICY "Owners can view webhook deliveries"
  ON public.webhook_deliveries FOR SELECT
  USING (public.is_company_owner(auth.uid(), company_id));

-- Trigger for updated_at on company_webhooks
CREATE TRIGGER update_company_webhooks_updated_at
  BEFORE UPDATE ON public.company_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();