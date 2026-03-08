
-- Add columns to routes table
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.routes ADD COLUMN IF NOT EXISTS activity_type text DEFAULT 'course';

-- Create route_photos table
CREATE TABLE IF NOT EXISTS public.route_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  lat numeric,
  lng numeric,
  caption text,
  created_at timestamptz DEFAULT now()
);

-- Create route_ratings table
CREATE TABLE IF NOT EXISTS public.route_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id uuid REFERENCES public.routes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  rating smallint NOT NULL,
  comment text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(route_id, user_id)
);

-- Create validation trigger for rating range instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_route_rating()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_route_rating
  BEFORE INSERT OR UPDATE ON public.route_ratings
  FOR EACH ROW EXECUTE FUNCTION public.validate_route_rating();

-- Enable RLS
ALTER TABLE public.route_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_ratings ENABLE ROW LEVEL SECURITY;

-- RLS for route_photos: anyone authenticated can view photos of public routes
CREATE POLICY "Anyone can view photos of public routes" ON public.route_photos
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.routes WHERE id = route_id AND is_public = true));

-- RLS for route_photos: owner can view own photos
CREATE POLICY "Users can view own route photos" ON public.route_photos
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- RLS for route_photos: owner can insert
CREATE POLICY "Users can insert own route photos" ON public.route_photos
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS for route_photos: owner can delete
CREATE POLICY "Users can delete own route photos" ON public.route_photos
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- RLS for route_ratings: anyone authenticated can view
CREATE POLICY "Anyone can view route ratings" ON public.route_ratings
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.routes WHERE id = route_id AND is_public = true));

-- RLS for route_ratings: users can insert own ratings
CREATE POLICY "Users can insert own ratings" ON public.route_ratings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS for route_ratings: users can update own ratings
CREATE POLICY "Users can update own ratings" ON public.route_ratings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- RLS for route_ratings: users can delete own ratings
CREATE POLICY "Users can delete own ratings" ON public.route_ratings
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Add RLS policy for public routes: anyone authenticated can view public routes
CREATE POLICY "Anyone can view public routes" ON public.routes
  FOR SELECT TO authenticated
  USING (is_public = true);

-- Create storage bucket for route photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('route-photos', 'route-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: anyone can view
CREATE POLICY "Anyone can view route photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'route-photos');

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload route photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'route-photos');

-- Storage RLS: users can delete own uploads
CREATE POLICY "Users can delete own route photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'route-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
