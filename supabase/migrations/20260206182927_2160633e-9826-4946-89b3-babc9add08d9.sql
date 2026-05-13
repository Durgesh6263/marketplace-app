
-- Create projects table matching the existing Project interface
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  short_description TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  category TEXT NOT NULL DEFAULT 'Web Development',
  thumbnail TEXT DEFAULT '',
  screenshots TEXT[] DEFAULT '{}',
  demo_video_url TEXT DEFAULT '',
  features TEXT[] DEFAULT '{}',
  tech_stack TEXT[] DEFAULT '{}',
  rating NUMERIC DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Public can read published projects
CREATE POLICY "Anyone can read published projects"
  ON public.projects
  FOR SELECT
  USING (is_published = true);

-- Only admins can insert/update/delete via edge function (service role)
-- No additional policies needed since edge function uses service role key

-- Trigger for updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
