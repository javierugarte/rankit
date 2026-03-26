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

create policy "Users can delete their own votes"
  on public.votes for delete using (
    auth.uid() = user_id
  );

-- =============================================
-- 8. TRIGGER — AUTO-CREAR PERFIL EN SIGNUP
-- =============================================

-- clone_demo_data: seeds 3 pre-populated lists for anonymous/demo users
create or replace function public.clone_demo_data(target_user_id uuid)
returns void as $$
declare
  series_list_id  uuid;
  movies_list_id  uuid;
  travel_list_id  uuid;
  top_series_item uuid;
begin
  insert into public.lists (name, emoji, list_type, owner_id)
  values ('Series que debes ver', '📺', 'tv', target_user_id)
  returning id into series_list_id;

  insert into public.items (list_id, title, total_votes, external_id, external_data) values
    (series_list_id, 'Breaking Bad',       28, '1396',   '{"poster_path":"/ggFHVNu6YYI5L9pCfOacjizRGt.jpg","year":"2008","genre":"Drama, Crime","overview":"Un profesor de química se convierte en fabricante de metanfetamina."}'),
    (series_list_id, 'The Wire',           24, '1438',   '{"poster_path":"/4lbClFySvugI51fwsyxBTOm4DqK.jpg","year":"2002","genre":"Drama, Crime","overview":"La vida en las calles de Baltimore vista desde ambos lados de la ley."}'),
    (series_list_id, 'Los Soprano',        21, '1398',   '{"poster_path":"/rTc7ZXdroqjkKivFPvCPX0Ru7dn.jpg","year":"1999","genre":"Drama, Crime","overview":"Tony Soprano equilibra su vida familiar con su rol como jefe de la mafia."}'),
    (series_list_id, 'Chernobyl',          19, '87108',  '{"poster_path":"/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg","year":"2019","genre":"Drama, History","overview":"La historia real de uno de los peores desastres nucleares de la historia."}'),
    (series_list_id, 'True Detective T1',  17, '46648',  '{"poster_path":"/wFMPPBaADHaMkwzq1JGnMw6sLBY.jpg","year":"2014","genre":"Drama, Crime, Mystery","overview":"Dos detectives investigan un misterioso asesinato a lo largo de 17 años."}'),
    (series_list_id, 'Band of Brothers',   15, '4613',   '{"poster_path":"/fGCEH3oPBWNlNdmNnOaGmv1g8Gn.jpg","year":"2001","genre":"Drama, War, History","overview":"La historia de la Compañía E del 506 de paracaidistas en la WWII."}'),
    (series_list_id, 'Six Feet Under',     12, '1621',   '{"poster_path":"/4kqSVd1FLPB5BCAK8IcFzgHnFG3.jpg","year":"2001","genre":"Drama","overview":"Una familia de pompas fúnebres navega la vida y la muerte en Los Ángeles."}'),
    (series_list_id, 'The Shield',         10, '2309',   '{"poster_path":"/jlIxSbkUxL0eFmZqIJPGQIqXjIq.jpg","year":"2002","genre":"Drama, Crime","overview":"Un policía corrupto pero efectivo opera en un barrio difícil de LA."}'),
    (series_list_id, 'Deadwood',            8, '1424',   '{"poster_path":"/g8R8pvNGmO4eMxcmFm0mRFd3R39.jpg","year":"2004","genre":"Drama, Western","overview":"Un pueblo del Lejano Oeste construye su propia ley."}'),
    (series_list_id, 'Roma',                6, '1689',   '{"poster_path":"/kHITELIxicPrHGYjAzfL5UwGWFX.jpg","year":"2005","genre":"Drama, History","overview":"La vida en la Roma del siglo I a.C. durante el ascenso de Julio César."}');

  insert into public.lists (name, emoji, list_type, owner_id)
  values ('Películas que debes ver', '🎬', 'movies', target_user_id)
  returning id into movies_list_id;

  insert into public.items (list_id, title, total_votes, external_id, external_data) values
    (movies_list_id, 'El Padrino',                  30, '238',    '{"poster_path":"/3bhkrj58Vtu7enYsLeBid05ICAZ.jpg","year":"1972","genre":"Drama, Crime","overview":"La historia de la familia Corleone, una poderosa organización criminal de NY."}'),
    (movies_list_id, 'La Lista de Schindler',        26, '424',    '{"poster_path":"/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg","year":"1993","genre":"Drama, History, War","overview":"Oskar Schindler salva la vida de más de mil judíos durante el Holocausto."}'),
    (movies_list_id, 'Pulp Fiction',                 23, '680',    '{"poster_path":"/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg","year":"1994","genre":"Thriller, Crime","overview":"Historias entrelazadas de criminales en Los Ángeles."}'),
    (movies_list_id, 'El Club de la Lucha',          20, '550',    '{"poster_path":"/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg","year":"1999","genre":"Drama, Thriller","overview":"Un empleado insatisfecho forma un club de lucha clandestino."}'),
    (movies_list_id, 'Parásitos',                    18, '496243', '{"poster_path":"/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg","year":"2019","genre":"Comedy, Thriller, Drama","overview":"Una familia pobre se infiltra en la vida de una familia adinerada."}'),
    (movies_list_id, 'Interstellar',                 16, '157336', '{"poster_path":"/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg","year":"2014","genre":"Adventure, Drama, Sci-Fi","overview":"Exploradores viajan a través de un agujero de gusano para salvar a la humanidad."}'),
    (movies_list_id, 'Blade Runner 2049',            13, '335984', '{"poster_path":"/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg","year":"2017","genre":"Sci-Fi, Drama","overview":"Un blade runner descubre un secreto que podría sumir a la sociedad en el caos."}'),
    (movies_list_id, '2001: Una Odisea del Espacio', 11, '62',     '{"poster_path":"/ve72VxNqjU9ft5djrMFrCDPnKa0.jpg","year":"1968","genre":"Sci-Fi, Mystery","overview":"Una misión espacial a Júpiter se complica cuando la IA se vuelve hostil."}'),
    (movies_list_id, 'Pozos de Ambición',             8, '7345',   '{"poster_path":"/fa0RDkAlCec0STeMNAhPaF89q6U.jpg","year":"2007","genre":"Drama","overview":"Un ambicioso prospector de petróleo en California a principios del siglo XX."}'),
    (movies_list_id, 'El Gran Lebowski',              6, '115',    '{"poster_path":"/dH0X3V1ToNl7K8VCZ6e4tQBd5WL.jpg","year":"1998","genre":"Comedy, Crime","overview":"El Nota es confundido con un millonario y se ve arrastrado a un extravagante secuestro."}');

  insert into public.lists (name, emoji, list_type, owner_id)
  values ('Próximos viajes', '✈️', null, target_user_id)
  returning id into travel_list_id;

  insert into public.items (list_id, title, total_votes) values
    (travel_list_id, 'Japón',        25),
    (travel_list_id, 'Islandia',     19),
    (travel_list_id, 'Corea del Sur',14),
    (travel_list_id, 'Tailandia',    10);

  -- Seed one vote so "Votaste hoy" badge is visible on the home screen
  select id into top_series_item from public.items
  where list_id = series_list_id order by total_votes desc limit 1;

  insert into public.votes (user_id, list_id, item_id, voted_date)
  values (target_user_id, series_list_id, top_series_item, current_date)
  on conflict do nothing;
end;
$$ language plpgsql security definer;

-- handle_new_user: creates profile and seeds demo data for anonymous users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  if new.is_anonymous then
    insert into public.profiles (id, username)
    values (new.id, 'demo_' || left(new.id::text, 8))
    on conflict (id) do nothing;
    perform public.clone_demo_data(new.id);
  else
    insert into public.profiles (id, username)
    values (new.id, coalesce(split_part(new.email, '@', 1), 'user'))
    on conflict (id) do nothing;
  end if;
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
