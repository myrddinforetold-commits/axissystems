-- Create access_requests table for public landing page submissions
CREATE TABLE public.access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an access request (public insert - no auth required)
CREATE POLICY "Anyone can submit access request"
  ON public.access_requests
  FOR INSERT
  WITH CHECK (true);

-- Only authenticated users can view requests (for admin purposes)
CREATE POLICY "Authenticated users can view requests"
  ON public.access_requests
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Create index on email for duplicate checking
CREATE INDEX idx_access_requests_email ON public.access_requests(email);

-- Create index on status for filtering
CREATE INDEX idx_access_requests_status ON public.access_requests(status);

-- Create index on created_at for sorting
CREATE INDEX idx_access_requests_created_at ON public.access_requests(created_at DESC);