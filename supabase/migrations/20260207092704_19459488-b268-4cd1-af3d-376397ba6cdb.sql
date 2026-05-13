
-- Fix 1: Add server-side input validation via CHECK constraints on contact_submissions
ALTER TABLE public.contact_submissions
ADD CONSTRAINT cs_name_length CHECK (char_length(name) <= 100),
ADD CONSTRAINT cs_email_length CHECK (char_length(email) <= 255),
ADD CONSTRAINT cs_title_length CHECK (char_length(project_title) <= 200),
ADD CONSTRAINT cs_desc_length CHECK (char_length(project_description) <= 2000),
ADD CONSTRAINT cs_budget_length CHECK (budget IS NULL OR char_length(budget) <= 100);

-- Fix 1b: Add server-side input validation via CHECK constraints on seller_requests
ALTER TABLE public.seller_requests
ADD CONSTRAINT sr_name_length CHECK (char_length(name) <= 100),
ADD CONSTRAINT sr_email_length CHECK (char_length(email) <= 255),
ADD CONSTRAINT sr_phone_length CHECK (char_length(phone) <= 20),
ADD CONSTRAINT sr_title_length CHECK (char_length(project_title) <= 200),
ADD CONSTRAINT sr_desc_length CHECK (char_length(project_description) <= 2000),
ADD CONSTRAINT sr_price_length CHECK (char_length(expected_price) <= 100),
ADD CONSTRAINT sr_tech_length CHECK (char_length(tech_stack) <= 500);

-- Fix 2: Restrict branding storage to admin-only write access
DROP POLICY IF EXISTS "Authenticated users can upload branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update branding assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete branding assets" ON storage.objects;

CREATE POLICY "Only admins can upload branding"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can update branding"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Only admins can delete branding"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'::public.app_role));
