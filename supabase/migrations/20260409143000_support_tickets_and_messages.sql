-- In-app support center: tickets + threaded messages

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general',
  subject text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user_created
  on public.support_tickets(user_id, created_at desc);

create or replace function public.touch_support_tickets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_support_tickets_updated_at on public.support_tickets;
create trigger trg_touch_support_tickets_updated_at
before update on public.support_tickets
for each row execute function public.touch_support_tickets_updated_at();

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

alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

drop policy if exists "support_tickets_select_own_or_admin" on public.support_tickets;
create policy "support_tickets_select_own_or_admin"
on public.support_tickets
for select
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

drop policy if exists "support_tickets_insert_own" on public.support_tickets;
create policy "support_tickets_insert_own"
on public.support_tickets
for insert
with check (auth.uid() = user_id);

drop policy if exists "support_tickets_update_own_or_admin" on public.support_tickets;
create policy "support_tickets_update_own_or_admin"
on public.support_tickets
for update
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.is_admin = true
  )
);

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
