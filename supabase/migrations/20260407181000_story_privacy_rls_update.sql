-- Aligner la visibilite des stories avec privacy / hide_from + highlights + public.

drop policy if exists "session_stories_select_visible" on public.session_stories;
create policy "session_stories_select_visible"
on public.session_stories
for select
to authenticated
using (
  auth.uid() = author_id
  or exists (
    select 1
    from public.profile_story_highlights psh
    where psh.story_id = session_stories.id
  )
  or (
    expires_at > now()
    and not (auth.uid() = any(coalesce(hide_from, '{}')))
    and (
      privacy = 'public'
      or (
        privacy in ('friends', 'custom')
        and exists (
          select 1
          from public.user_follows uf
          where uf.follower_id = auth.uid()
            and uf.following_id = author_id
            and uf.status = 'accepted'
        )
      )
    )
  )
);

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
        or exists (
          select 1
          from public.profile_story_highlights psh
          where psh.story_id = ss.id
        )
        or (
          ss.expires_at > now()
          and not (auth.uid() = any(coalesce(ss.hide_from, '{}')))
          and (
            ss.privacy = 'public'
            or (
              ss.privacy in ('friends', 'custom')
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
      )
  )
);
