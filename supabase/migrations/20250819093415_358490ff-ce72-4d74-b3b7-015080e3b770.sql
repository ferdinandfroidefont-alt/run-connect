-- Add file attachment support to messages table
ALTER TABLE public.messages ADD COLUMN file_url TEXT;
ALTER TABLE public.messages ADD COLUMN file_type TEXT;
ALTER TABLE public.messages ADD COLUMN file_name TEXT;