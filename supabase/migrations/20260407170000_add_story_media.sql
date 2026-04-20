alter table public.session_stories
  alter column session_id drop not null;

alter table public.session_stories
  add column if not exists privacy text not null default 'friends';

alter table public.session_stories
  add column if not exists hide_from uuid[] not null default '{}';

create table if not exists public.story_media (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.session_stories(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image', 'video', 'boomerang')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_story_media_story_id
  on public.story_media(story_id);

insert into storage.buckets (id, name, public)
values ('story-media', 'story-media', true)
on conflict (id) do nothing;

alter table public.story_media enable row level security;

drop policy if exists "story_media_select_visible" on public.story_media;
create policy "story_media_select_visible"
on public.story_media
for select
to authenticated
using (
  exists (
    select 1
    from public.session_stories ss
    where ss.id = story_media.story_id
      and (
        ss.author_id = auth.uid()
        or (
          ss.expires_at > now()
          and exists (
            select 1
            from public.user_follows uf
            where uf.follower_id = auth.uid()
              and uf.following_id = ss.author_id
              and uf.status = 'accepted'
          )
        )
      )
  )
);

drop policy if exists "story_media_insert_owner" on public.story_media;
create policy "story_media_insert_owner"
on public.story_media
for insert
to authenticated
with check (
  exists (
    select 1
    from public.session_stories ss
    where ss.id = story_media.story_id
      and ss.author_id = auth.uid()
  )
);

drop policy if exists "story_media_update_owner" on public.story_media;
create policy "story_media_update_owner"
on public.story_media
for update
to authenticated
using (
  exists (
    select 1
    from public.session_stories ss
    where ss.id = story_media.story_id
      and ss.author_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.session_stories ss
    where ss.id = story_media.story_id
      and ss.author_id = auth.uid()
  )
);

drop policy if exists "story_media_delete_owner" on public.story_media;
create policy "story_media_delete_owner"
on public.story_media
for delete
to authenticated
using (
  exists (
    select 1
    from public.session_stories ss
    where ss.id = story_media.story_id
      and ss.author_id = auth.uid()
  )
);

create policy "Users can view story media files"
on storage.objects
for select
using (bucket_id = 'story-media');

create policy "Users can upload own story media files"
on storage.objects
for insert
with check (
  bucket_id = 'story-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own story media files"
on storage.objects
for update
using (
  bucket_id = 'story-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own story media files"
on storage.objects
for delete
using (
  bucket_id = 'story-media'
  and auth.uid()::text = (storage.foldername(name))[1]
);
