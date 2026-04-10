create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null,
  category text not null default 'general',
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_tickets enable row level security;

create policy "Users can view own tickets"
  on public.support_tickets for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create own tickets"
  on public.support_tickets for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own tickets"
  on public.support_tickets for update
  to authenticated
  using (auth.uid() = user_id);