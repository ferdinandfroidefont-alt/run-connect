create table if not exists public.profile_story_highlights (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  story_id uuid not null references public.session_stories(id) on delete cascade,
  title text not null default 'A la une',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_profile_story_highlights_owner_story
  on public.profile_story_highlights(owner_id, story_id);

create index if not exists idx_profile_story_highlights_owner_position
  on public.profile_story_highlights(owner_id, position asc, created_at asc);

alter table public.profile_story_highlights enable row level security;

drop policy if exists "profile_story_highlights_select_all" on public.profile_story_highlights;
create policy "profile_story_highlights_select_all"
on public.profile_story_highlights
for select
to authenticated
using (true);

drop policy if exists "profile_story_highlights_insert_owner" on public.profile_story_highlights;
create policy "profile_story_highlights_insert_owner"
on public.profile_story_highlights
for insert
to authenticated
with check (owner_id = auth.uid());

drop policy if exists "profile_story_highlights_update_owner" on public.profile_story_highlights;
create policy "profile_story_highlights_update_owner"
on public.profile_story_highlights
for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

drop policy if exists "profile_story_highlights_delete_owner" on public.profile_story_highlights;
create policy "profile_story_highlights_delete_owner"
on public.profile_story_highlights
for delete
to authenticated
using (owner_id = auth.uid());

drop policy if exists "session_stories_select_visible" on public.session_stories;
create policy "session_stories_select_visible"
on public.session_stories
for select
to authenticated
using (
  auth.uid() = author_id
  or (
    expires_at > now()
    and exists (
      select 1
      from public.user_follows uf
      where uf.follower_id = auth.uid()
        and uf.following_id = author_id
        and uf.status = 'accepted'
    )
  )
  or exists (
    select 1
    from public.profile_story_highlights psh
    where psh.story_id = session_stories.id
  )
);
