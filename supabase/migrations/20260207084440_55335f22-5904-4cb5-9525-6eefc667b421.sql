
-- 1. Contact submissions table
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  project_title TEXT NOT NULL,
  project_description TEXT NOT NULL,
  budget TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a contact form
CREATE POLICY "Anyone can submit contact form"
ON public.contact_submissions
FOR INSERT
WITH CHECK (true);

-- No public read access
CREATE POLICY "No public read on contact submissions"
ON public.contact_submissions
FOR SELECT
USING (false);

-- Add trigger for updated_at
CREATE TRIGGER update_contact_submissions_updated_at
BEFORE UPDATE ON public.contact_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for contact_submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_submissions;

-- 2. Site branding table (single-row config)
CREATE TABLE public.site_branding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL DEFAULT 'The Last Minute Project',
  logo_url TEXT,
  favicon_url TEXT,
  support_email TEXT NOT NULL DEFAULT 'omjatale62@gmail.com',
  contact_phone TEXT NOT NULL DEFAULT '+91 6263097104',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;

-- Anyone can read branding (needed for frontend)
CREATE POLICY "Anyone can read site branding"
ON public.site_branding
FOR SELECT
USING (true);

-- No public write
CREATE POLICY "No public write on site branding"
ON public.site_branding
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No public update on site branding"
ON public.site_branding
FOR UPDATE
USING (false);

-- Add trigger for updated_at
CREATE TRIGGER update_site_branding_updated_at
BEFORE UPDATE ON public.site_branding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for site_branding
ALTER PUBLICATION supabase_realtime ADD TABLE public.site_branding;

-- Insert default branding row
INSERT INTO public.site_branding (site_name, support_email, contact_phone)
VALUES ('The Last Minute Project', 'omjatale62@gmail.com', '+91 6263097104');

-- 3. Storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true);

-- Public read access for branding assets
CREATE POLICY "Branding assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'branding');

-- Only authenticated users (admins via edge function) can upload
CREATE POLICY "Authenticated users can upload branding assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'branding' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update branding assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'branding' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete branding assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'branding' AND auth.role() = 'authenticated');
