create table if not exists public.session_stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  caption text null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.session_story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.session_stories(id) on delete cascade,
  viewer_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (story_id, viewer_id)
);

create index if not exists idx_session_stories_author_expires
  on public.session_stories(author_id, expires_at desc);

create index if not exists idx_session_stories_expires
  on public.session_stories(expires_at desc);

create index if not exists idx_session_story_views_story
  on public.session_story_views(story_id, created_at desc);

alter table public.session_stories enable row level security;
alter table public.session_story_views enable row level security;

drop policy if exists "session_stories_select_visible" on public.session_stories;
create policy "session_stories_select_visible"
on public.session_stories
for select
to authenticated
using (
  expires_at > now()
  and (
    auth.uid() = author_id
    or exists (
      select 1
      from public.user_follows uf
      where uf.follower_id = auth.uid()
        and uf.following_id = author_id
        and uf.status = 'accepted'
    )
  )
);

drop policy if exists "session_stories_insert_own" on public.session_stories;
create policy "session_stories_insert_own"
on public.session_stories
for insert
to authenticated
with check (
  auth.uid() = author_id
  and expires_at > now()
);

drop policy if exists "session_stories_update_own" on public.session_stories;
create policy "session_stories_update_own"
on public.session_stories
for update
to authenticated
using (auth.uid() = author_id)
with check (auth.uid() = author_id);

drop policy if exists "session_stories_delete_own" on public.session_stories;
create policy "session_stories_delete_own"
on public.session_stories
for delete
to authenticated
using (auth.uid() = author_id);

drop policy if exists "session_story_views_select" on public.session_story_views;
create policy "session_story_views_select"
on public.session_story_views
for select
to authenticated
using (
  viewer_id = auth.uid()
  or exists (
    select 1
    from public.session_stories ss
    where ss.id = story_id
      and ss.author_id = auth.uid()
  )
);

drop policy if exists "session_story_views_insert_self" on public.session_story_views;
create policy "session_story_views_insert_self"
on public.session_story_views
for insert
to authenticated
with check (
  viewer_id = auth.uid()
  and exists (
    select 1
    from public.session_stories ss
    where ss.id = story_id
      and ss.expires_at > now()
      and (
        ss.author_id = auth.uid()
        or exists (
          select 1
          from public.user_follows uf
          where uf.follower_id = auth.uid()
            and uf.following_id = ss.author_id
            and uf.status = 'accepted'
        )
      )
  )
);
