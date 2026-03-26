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
  -- ── Series ─────────────────────────────────────────────────
  insert into public.lists (name, emoji, list_type, owner_id)
  values ('Series', '📺', 'tv', target_user_id)
  returning id into series_list_id;

  insert into public.items (list_id, title, total_votes, external_id, external_data, category) values
    (series_list_id, 'Breaking Bad',              27, '1396',
     '{"poster_path":"/ztkUQFLlC19CCMYHW9o1zWhJRNq.jpg","year":"2008","genre":"Drama","overview":"Un profesor de química con cáncer terminal se asocia con un exalumno suyo para fabricar y vender metanfetamina a fin de que su familia no pase apuros económicos."}',
     'Drama • 2008'),
    (series_list_id, 'Bajo escucha',              25, '1438',
     '{"poster_path":"/v5m7os416ER2a9dTE0M017KqRmZ.jpg","year":"2002","genre":"Crimen","overview":"Un sencillo y extremadamente realista drama que sigue una caótica investigación de drogas y asesinatos en Baltimore, mostrando ambas perspectivas: la policía y los criminales."}',
     'Crimen • 2002'),
    (series_list_id, 'Los Soprano',               21, '1398',
     '{"poster_path":"/p7XPjx5jTFl32TGbbIW8exdY8QW.jpg","year":"1999","genre":"Crimen","overview":"La trama gira en torno al mafioso de Nueva Jersey Tony Soprano y las dificultades que enfrenta tanto en su hogar como en la organización criminal que dirige."}',
     'Crimen • 1999'),
    (series_list_id, 'Chernobyl',                 19, '87108',
     '{"poster_path":"/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg","year":"2019","genre":"Drama","overview":"La serie relata lo que aconteció en 1986, en uno de los mayores desastres provocados por el hombre en la historia reciente, así como los sacrificios realizados para salvar al continente."}',
     'Drama • 2019'),
    (series_list_id, 'True Detective',             17, '46648',
     '{"poster_path":"/xZSuQm2KQQKoVKf31HgUWkjAVga.jpg","year":"2014","genre":"Drama","overview":"En Luisiana, en 1995, dos detectives investigan el atroz asesinato de una joven. En 2012, unos policías los interrogan de nuevo, sospechando que el asesino de 1995 ha regresado."}',
     'Drama • 2014'),
    (series_list_id, 'Hermanos de sangre',         15, '4613',
     '{"poster_path":"/kq9KiusAWPPITQrGovbgdhD9R1R.jpg","year":"2001","genre":"Drama","overview":"Miniserie basada en el bestseller de Stephen E. Ambrose. Narra la historia de la Easy Company, un batallón americano de paracaidistas que luchó en Europa durante la II Guerra Mundial."}',
     'Drama • 2001'),
    (series_list_id, 'A dos metros bajo tierra',  12, '1274',
     '{"poster_path":"/Al4RjjnnTNyLEn5idIxl2zfqYV5.jpg","year":"2001","genre":"Drama","overview":"El día de Nochebuena Nathaniel Fisher muere en un accidente. Su familia, al frente de una funeraria, navega el duelo, secretos y relaciones mientras gestiona el negocio familiar."}',
     'Drama • 2001'),
    (series_list_id, 'The Shield: Al margen de la ley', 10, '1414',
     '{"poster_path":"/AfdZXqqlFsPUEfi6kWWWthxw7Nz.jpg","year":"2002","genre":"Crimen","overview":"El detective Vic Mackey dirige una unidad especial en Los Ángeles, muy eficaz contra el crimen pero con métodos tan cuestionables como la extorsión o el chantaje cuando los considera necesarios."}',
     'Crimen • 2002'),
    (series_list_id, 'Deadwood',                   8, '1406',
     '{"poster_path":"/fWwxYAuqY4Na7fKI3Qq2nFWCwG8.jpg","year":"2004","genre":"Western","overview":"Deadwood recrea la historia de la ciudad homónima durante el siglo XIX, combinando personajes reales, tramas noveladas y leyendas de una ciudad sin ley en territorio robado."}',
     'Western • 2004'),
    (series_list_id, 'Juego de tronos',             6, '1399',
     '{"poster_path":"/3hDtRuwTfQQYRst3kjhvp4Cogjw.jpg","year":"2011","genre":"Ciencia ficcion","overview":"Dos poderosas familias mantienen un enfrentamiento letal por gobernar los Siete Reinos de Poniente, mientras fuerzas sobrenaturales acechan más allá del gran muro del norte."}',
     'Ciencia ficcion • 2011');

  -- ── Movies ─────────────────────────────────────────────────
  insert into public.lists (name, emoji, list_type, owner_id)
  values ('Películas', '🎬', 'movies', target_user_id)
  returning id into movies_list_id;

  insert into public.items (list_id, title, total_votes, completed, external_id, external_data, category) values
    (movies_list_id, 'El padrino',               30, true,  '238',
     '{"poster_path":"/ApiEfzSkrqS4m1L5a2GwWXzIiAs.jpg","year":"1972","genre":"Drama","overview":"Don Vito Corleone es el patriarca de una de las cinco familias que mandan en la Cosa Nostra de Nueva York. Cuando rechaza entrar en el negocio de los estupefacientes, empieza una cruenta guerra entre familias del crimen organizado."}',
     'Drama • 1972'),
    (movies_list_id, 'La lista de Schindler',     26, false, '424',
     '{"poster_path":"/3Ho0pXsnMxpGJWqdOi0KDNdaTkT.jpg","year":"1993","genre":"Drama","overview":"Oskar Schindler, usando sus relaciones con los nazis, consigue la propiedad de una fábrica en Cracovia y emplea a cientos de judíos, salvando más de mil vidas durante el Holocausto."}',
     'Drama • 1993'),
    (movies_list_id, 'Pulp Fiction',              23, false, '680',
     '{"poster_path":"/hNcQAuquJxTxl2fJFs1R42DrWcf.jpg","year":"1994","genre":"Suspense","overview":"Jules y Vincent, dos asesinos a sueldo, trabajan para Marsellus Wallace. Sus misiones y las de otros personajes se entrelazan en una serie de historias violentas y con mucho humor negro."}',
     'Suspense • 1994'),
    (movies_list_id, 'El club de la lucha',       20, false, '550',
     '{"poster_path":"/sgTAWJFaB2kBvdQxRGabYFiQqEK.jpg","year":"1999","genre":"Drama","overview":"Un hombre consumido por el insomnio conoce a Tyler Durden, un carismático anarquista que lo arrastra a un club secreto. Lo que comienza como liberación se convierte en una guerra contra el sistema."}',
     'Drama • 1999'),
    (movies_list_id, 'Parásitos',                 18, false, '496243',
     '{"poster_path":"/4N55tgxDW0RRATyrZHbx0q9HUKv.jpg","year":"2019","genre":"Comedia","overview":"La familia Kim, en paro, consigue infiltrarse en la vida de la adinerada familia Park. Lo que empieza como una oportunidad pronto deriva en consecuencias imprevistas para ambas familias."}',
     'Comedia • 2019'),
    (movies_list_id, 'Blade Runner 2049',         13, false, '335984',
     '{"poster_path":"/cOt8SQwrxpoTv9Bc3kyce3etkZX.jpg","year":"2017","genre":"Ciencia ficcion","overview":"El oficial K, blade runner del LAPD, descubre un secreto enterrado durante décadas. Su investigación le lleva a buscar al legendario Rick Deckard, desaparecido desde hace 30 años."}',
     'Ciencia ficcion • 2017'),
    (movies_list_id, '2001: Una odisea del espacio', 11, false, '62',
     '{"poster_path":"/sln50uQYigvu5AvN72JfYfu1ckq.jpg","year":"1968","genre":"Ciencia ficcion","overview":"Una misión espacial a Júpiter se complica cuando HAL 9000, la inteligencia artificial de la nave, comienza a actuar de forma hostil contra su propia tripulación."}',
     'Ciencia ficcion • 1968'),
    (movies_list_id, 'El gran Lebowski',           6, false, '115',
     '{"poster_path":"/EJFkJD9BH400jfzKz3W5xLYHQa.jpg","year":"1998","genre":"Comedia","overview":"El Nota es confundido con un millonario del mismo nombre. Junto a su compinche Walter se ven atrapados en un thriller con toques humorísticos donde se mezclan extorsión, chantaje y las drogas."}',
     'Comedia • 1998');

  -- ── Travel ─────────────────────────────────────────────────
  insert into public.lists (name, emoji, list_type, owner_id)
  values ('Próximos viajes', '✈️', null, target_user_id)
  returning id into travel_list_id;

  insert into public.items (list_id, title, total_votes) values
    (travel_list_id, 'Japón',         25),
    (travel_list_id, 'Islandia',      19),
    (travel_list_id, 'Corea del Sur', 14),
    (travel_list_id, 'Tailandia',     10);

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
