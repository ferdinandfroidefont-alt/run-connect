-- Create routes table to store session routes
CREATE TABLE public.routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  coordinates JSONB NOT NULL, -- Array of {lat, lng, elevation} points
  total_distance NUMERIC, -- Total distance in meters
  total_elevation_gain NUMERIC, -- Total elevation gain in meters
  total_elevation_loss NUMERIC, -- Total elevation loss in meters
  min_elevation NUMERIC, -- Minimum elevation in meters
  max_elevation NUMERIC, -- Maximum elevation in meters
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can create routes" ON public.routes
FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can view routes" ON public.routes
FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Route creators can update their routes" ON public.routes
FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Route creators can delete their routes" ON public.routes
FOR DELETE
USING (auth.uid() = created_by);

-- Create trigger for updated_at
CREATE TRIGGER update_routes_updated_at
BEFORE UPDATE ON public.routes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();