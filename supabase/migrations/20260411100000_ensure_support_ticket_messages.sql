-- Répare les projets où seule public.support_tickets existe (ex. migration partielle).
-- Sans cette table, PostgREST renvoie : could not find ... support_ticket_messages in the schema cache

create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  is_staff boolean not null default false,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_support_ticket_messages_ticket_created
  on public.support_ticket_messages(ticket_id, created_at asc);

alter table public.support_ticket_messages enable row level security;

drop policy if exists "support_ticket_messages_select_own_or_admin" on public.support_ticket_messages;
create policy "support_ticket_messages_select_own_or_admin"
on public.support_ticket_messages
for select
using (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        t.user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.is_admin = true
        )
      )
  )
);

drop policy if exists "support_ticket_messages_insert_own_or_admin" on public.support_ticket_messages;
create policy "support_ticket_messages_insert_own_or_admin"
on public.support_ticket_messages
for insert
with check (
  exists (
    select 1
    from public.support_tickets t
    where t.id = support_ticket_messages.ticket_id
      and (
        t.user_id = auth.uid()
        or exists (
          select 1 from public.profiles p
          where p.user_id = auth.uid() and p.is_admin = true
        )
      )
  )
  and (
    author_user_id is null
    or author_user_id = auth.uid()
  )
);
