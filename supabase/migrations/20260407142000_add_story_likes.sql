create table if not exists public.session_story_likes (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.session_stories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (story_id, user_id)
);

create index if not exists idx_session_story_likes_story
  on public.session_story_likes(story_id, created_at desc);

alter table public.session_story_likes enable row level security;

drop policy if exists "session_story_likes_select_visible" on public.session_story_likes;
create policy "session_story_likes_select_visible"
on public.session_story_likes
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.session_stories ss
    where ss.id = story_id
      and ss.author_id = auth.uid()
  )
);

drop policy if exists "session_story_likes_insert_self" on public.session_story_likes;
create policy "session_story_likes_insert_self"
on public.session_story_likes
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.session_stories ss
    where ss.id = story_id
      and (
        ss.author_id = auth.uid()
        or ss.expires_at > now()
      )
  )
);

drop policy if exists "session_story_likes_delete_self" on public.session_story_likes;
create policy "session_story_likes_delete_self"
on public.session_story_likes
for delete
to authenticated
using (user_id = auth.uid());
