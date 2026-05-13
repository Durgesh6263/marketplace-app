
-- Create a table for anonymous project ratings
CREATE TABLE public.project_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  session_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One rating per session per project
CREATE UNIQUE INDEX idx_project_ratings_session ON public.project_ratings (project_id, session_id);

-- Enable RLS
ALTER TABLE public.project_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a rating (anonymous)
CREATE POLICY "Anyone can submit a rating"
ON public.project_ratings
FOR INSERT
WITH CHECK (true);

-- Anyone can read ratings (to check if already rated)
CREATE POLICY "Anyone can read ratings"
ON public.project_ratings
FOR SELECT
USING (true);

-- Create function to recalculate average rating on projects table
CREATE OR REPLACE FUNCTION public.update_project_avg_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.projects
  SET rating = (
    SELECT COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0)
    FROM public.project_ratings r
    WHERE r.project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger after insert/update/delete on project_ratings
CREATE TRIGGER trg_update_project_avg_rating
AFTER INSERT OR UPDATE OR DELETE ON public.project_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_project_avg_rating();

-- Enable realtime for project_ratings
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_ratings;
