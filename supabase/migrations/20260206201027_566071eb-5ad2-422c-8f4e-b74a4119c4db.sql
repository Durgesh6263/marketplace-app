
-- Add download_url column to projects for Google Drive links per project
ALTER TABLE public.projects ADD COLUMN download_url text DEFAULT '';

-- Add total_downloads column for tracking downloads separately from sales
ALTER TABLE public.projects ADD COLUMN total_downloads integer DEFAULT 0;

-- Create trigger to increment downloads on paid orders
CREATE OR REPLACE FUNCTION public.increment_project_downloads()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status <> 'paid') THEN
    UPDATE public.projects
    SET total_downloads = COALESCE(total_downloads, 0) + 1
    WHERE id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER increment_downloads_on_payment
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_project_downloads();
