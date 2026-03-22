-- =============================================
-- RANKIT — Supabase Schema
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- =============================================

create extension if not exists "pgcrypto";

-- =============================================
-- 1. CREAR TODAS LAS TABLAS
-- =============================================

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  avatar_url text,
  created_at timestamptz default now() not null
);

create table public.lists (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  emoji text default '🎬' not null,
  list_type text,
  owner_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now() not null
);

create table public.list_members (
  list_id uuid references public.lists(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  joined_at timestamptz default now() not null,
  primary key (list_id, user_id)
);

create table public.items (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references public.lists(id) on delete cascade not null,
  title text not null,
  category text,
  external_id text,
  external_data jsonb,
  added_by uuid references public.profiles(id) on delete set null,
  completed boolean default false not null,
  completed_at timestamptz,
  total_votes integer default 0 not null,
  created_at timestamptz default now() not null
);

create table public.votes (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references public.items(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  list_id uuid references public.lists(id) on delete cascade not null,
  voted_date date default current_date not null,
  created_at timestamptz default now() not null,
  unique (user_id, list_id, voted_date)
);

-- =============================================
-- 2. HABILITAR RLS EN TODAS LAS TABLAS
-- =============================================

alter table public.profiles enable row level security;
alter table public.lists enable row level security;
alter table public.list_members enable row level security;
alter table public.items enable row level security;
alter table public.votes enable row level security;

-- =============================================
-- 3. POLÍTICAS RLS — PROFILES
-- =============================================

create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- =============================================
-- 4. POLÍTICAS RLS — LISTS
-- (list_members ya existe aquí)
-- =============================================

create policy "Users can view lists they own or are members of"
  on public.lists for select using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.list_members lm
      where lm.list_id = lists.id and lm.user_id = auth.uid()
    )
  );

create policy "Users can create lists"
  on public.lists for insert with check (auth.uid() = owner_id);

create policy "Owners can update their lists"
  on public.lists for update using (auth.uid() = owner_id);

create policy "Owners can delete their lists"
  on public.lists for delete using (auth.uid() = owner_id);

-- =============================================
-- 5. POLÍTICAS RLS — LIST_MEMBERS
-- =============================================

create policy "Members can view list memberships"
  on public.list_members for select using (
    auth.uid() = user_id
  );

create policy "Owners can add members"
  on public.list_members for insert with check (
    exists (
      select 1 from public.lists l
      where l.id = list_members.list_id and l.owner_id = auth.uid()
    )
  );

create policy "Owners can remove members"
  on public.list_members for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from public.lists l
      where l.id = list_members.list_id and l.owner_id = auth.uid()
    )
  );

-- =============================================
-- 6. POLÍTICAS RLS — ITEMS
-- =============================================

create policy "Members can view items in their lists"
  on public.items for select using (
    exists (
      select 1 from public.lists l
      where l.id = items.list_id
        and (
          l.owner_id = auth.uid()
          or exists (
            select 1 from public.list_members lm
            where lm.list_id = items.list_id and lm.user_id = auth.uid()
          )
        )
    )
  );

create policy "Members can add items"
  on public.items for insert with check (
    exists (
      select 1 from public.lists l
      where l.id = items.list_id
        and (
          l.owner_id = auth.uid()
          or exists (
            select 1 from public.list_members lm
            where lm.list_id = items.list_id and lm.user_id = auth.uid()
          )
        )
    )
  );

create policy "Members can update items"
  on public.items for update using (
    exists (
      select 1 from public.lists l
      where l.id = items.list_id
        and (
          l.owner_id = auth.uid()
          or exists (
            select 1 from public.list_members lm
            where lm.list_id = items.list_id and lm.user_id = auth.uid()
          )
        )
    )
  );

-- =============================================
-- 7. POLÍTICAS RLS — VOTES
-- =============================================

create policy "Users can view votes in their lists"
  on public.votes for select using (
    exists (
      select 1 from public.lists l
      where l.id = votes.list_id
        and (
          l.owner_id = auth.uid()
          or exists (
            select 1 from public.list_members lm
            where lm.list_id = votes.list_id and lm.user_id = auth.uid()
          )
        )
    )
  );

create policy "Users can vote in their lists"
  on public.votes for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.lists l
      where l.id = votes.list_id
        and (
          l.owner_id = auth.uid()
          or exists (
            select 1 from public.list_members lm
            where lm.list_id = votes.list_id and lm.user_id = auth.uid()
          )
        )
    )
  );

-- =============================================
-- 8. TRIGGER — AUTO-CREAR PERFIL EN SIGNUP
-- =============================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- 9. REALTIME
-- =============================================

alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.votes;
