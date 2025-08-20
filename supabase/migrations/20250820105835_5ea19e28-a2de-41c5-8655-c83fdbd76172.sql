-- Create a dedicated bucket for message files
insert into storage.buckets (id, name, public)
values ('message-files', 'message-files', true)
on conflict (id) do nothing;

-- Create RLS policies for message files
create policy "Users can upload message files"
on storage.objects for insert
with check (
  bucket_id = 'message-files' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can view message files"
on storage.objects for select
using (bucket_id = 'message-files');

create policy "Users can update their message files"
on storage.objects for update
using (
  bucket_id = 'message-files' 
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete their message files"
on storage.objects for delete
using (
  bucket_id = 'message-files' 
  and auth.uid()::text = (storage.foldername(name))[1]
);