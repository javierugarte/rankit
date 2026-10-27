-- Allows the iPhone app to approve a one-time Rankit session for Apple TV.
-- All access is mediated by the server-side API using the service role.
create table public.towatchtv_device_pairings (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null unique,
  device_secret_hash text not null unique,
  user_id uuid references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'consumed')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  consumed_at timestamptz
);

create index towatchtv_device_pairings_expiry_index
  on public.towatchtv_device_pairings (expires_at);

alter table public.towatchtv_device_pairings enable row level security;
