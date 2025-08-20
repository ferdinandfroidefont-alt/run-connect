-- Allow club creators to delete their clubs
CREATE POLICY "Club creators can delete their clubs" 
ON public.conversations 
FOR DELETE 
USING (
  auth.uid() = created_by AND is_group = true
);