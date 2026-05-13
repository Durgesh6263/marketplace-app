
-- Create table for seller commission requests
CREATE TABLE public.seller_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL,
  expected_price TEXT NOT NULL,
  tech_stack TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public contact form)
CREATE POLICY "Anyone can submit a seller request"
  ON public.seller_requests
  FOR INSERT
  WITH CHECK (true);

-- Only admins should read requests (we'll restrict via has_role later; for now deny public reads)
CREATE POLICY "No public read access"
  ON public.seller_requests
  FOR SELECT
  USING (false);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_seller_requests_updated_at
  BEFORE UPDATE ON public.seller_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
