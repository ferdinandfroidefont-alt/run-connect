-- Add route_id column to sessions table
ALTER TABLE public.sessions 
ADD COLUMN route_id UUID REFERENCES public.routes(id) ON DELETE SET NULL;