-- Garantit le bucket Storage des stories (corrige « Bucket not found » si la migration initiale n’a pas été appliquée).

insert into storage.buckets (id, name, public)
values ('story-media', 'story-media', true)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public;

drop policy if exists "Users can view story media files" on storage.objects;
create policy "Users can view story media files"
on storage.objects
for select
using (bucket_id = 'story-media');

drop policy if exists "Users can upload own story media files" on storage.objects;
create policy "Users can upload own story media files"
on storage.objects
for insert
with check (
  bucket_id = 'story-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can update own story media files" on storage.objects;
create policy "Users can update own story media files"
on storage.objects
for update
using (
  bucket_id = 'story-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "Users can delete own story media files" on storage.objects;
create policy "Users can delete own story media files"
on storage.objects
for delete
using (
  bucket_id = 'story-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);
