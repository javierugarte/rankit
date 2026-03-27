-- ============================================================
-- DEMO MODE
-- Anonymous sign-in creates an isolated sandbox with pre-seeded
-- lists cloned from hardcoded demo data.
-- ============================================================

-- 1. clone_demo_data — inserts 3 pre-seeded demo lists for a new user
CREATE OR REPLACE FUNCTION public.clone_demo_data(target_user_id uuid)
RETURNS void AS $$
DECLARE
  series_list_id  uuid;
  movies_list_id  uuid;
  travel_list_id  uuid;
  top_series_item uuid;
  top_movies_item uuid;
BEGIN
  -- ── Series ─────────────────────────────────────────────────
  INSERT INTO public.lists (name, emoji, list_type, owner_id)
  VALUES ('Series que debes ver', '📺', 'tv', target_user_id)
  RETURNING id INTO series_list_id;

  INSERT INTO public.items (list_id, title, total_votes, external_id, external_data)
  VALUES
    (series_list_id, 'Breaking Bad',        28, '1396',   '{"poster_path":"/ggFHVNu6YYI5L9pCfOacjizRGt.jpg","year":"2008","genre":"Drama, Crime","overview":"Un profesor de química se convierte en fabricante de metanfetamina."}'),
    (series_list_id, 'The Wire',            24, '1438',   '{"poster_path":"/4lbClFySvugI51fwsyxBTOm4DqK.jpg","year":"2002","genre":"Drama, Crime","overview":"La vida en las calles de Baltimore vista desde ambos lados de la ley."}'),
    (series_list_id, 'Los Soprano',         21, '1398',   '{"poster_path":"/rTc7ZXdroqjkKivFPvCPX0Ru7dn.jpg","year":"1999","genre":"Drama, Crime","overview":"Tony Soprano equilibra su vida familiar con su rol como jefe de la mafia."}'),
    (series_list_id, 'Chernobyl',           19, '87108',  '{"poster_path":"/hlLXt2tOPT6RRnjiUmoxyG1LTFi.jpg","year":"2019","genre":"Drama, History","overview":"La historia real de uno de los peores desastres nucleares de la historia."}'),
    (series_list_id, 'True Detective T1',   17, '46648',  '{"poster_path":"/wFMPPBaADHaMkwzq1JGnMw6sLBY.jpg","year":"2014","genre":"Drama, Crime, Mystery","overview":"Dos detectives de Louisiana investigan un misterioso asesinato a lo largo de 17 años."}'),
    (series_list_id, 'Band of Brothers',    15, '4613',   '{"poster_path":"/fGCEH3oPBWNlNdmNnOaGmv1g8Gn.jpg","year":"2001","genre":"Drama, War, History","overview":"La historia de la Compañía E del 506 de paracaidistas en la Segunda Guerra Mundial."}'),
    (series_list_id, 'Six Feet Under',      12, '1621',   '{"poster_path":"/4kqSVd1FLPB5BCAK8IcFzgHnFG3.jpg","year":"2001","genre":"Drama","overview":"Una familia de pompas fúnebres navega la vida y la muerte en Los Ángeles."}'),
    (series_list_id, 'The Shield',          10, '2309',   '{"poster_path":"/jlIxSbkUxL0eFmZqIJPGQIqXjIq.jpg","year":"2002","genre":"Drama, Crime","overview":"Un policía corrupto pero efectivo opera en un barrio difícil de Los Ángeles."}'),
    (series_list_id, 'Deadwood',             8, '1424',   '{"poster_path":"/g8R8pvNGmO4eMxcmFm0mRFd3R39.jpg","year":"2004","genre":"Drama, Western","overview":"Un pueblo del Lejano Oeste en los años 1870 construye su propia ley."}'),
    (series_list_id, 'Roma',                 6, '1689',   '{"poster_path":"/kHITELIxicPrHGYjAzfL5UwGWFX.jpg","year":"2005","genre":"Drama, History","overview":"La vida en la Roma del siglo I a.C. durante el ascenso de Julio César."}');

  -- ── Movies ─────────────────────────────────────────────────
  INSERT INTO public.lists (name, emoji, list_type, owner_id)
  VALUES ('Películas que debes ver', '🎬', 'movies', target_user_id)
  RETURNING id INTO movies_list_id;

  INSERT INTO public.items (list_id, title, total_votes, external_id, external_data)
  VALUES
    (movies_list_id, 'El Padrino',                   30, '238',    '{"poster_path":"/3bhkrj58Vtu7enYsLeBid05ICAZ.jpg","year":"1972","genre":"Drama, Crime","overview":"La historia de la familia Corleone, una de las más poderosas organizaciones criminales de Nueva York."}'),
    (movies_list_id, 'La Lista de Schindler',         26, '424',    '{"poster_path":"/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg","year":"1993","genre":"Drama, History, War","overview":"Oskar Schindler salva la vida de más de mil judíos polacos durante el Holocausto."}'),
    (movies_list_id, 'Pulp Fiction',                  23, '680',    '{"poster_path":"/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg","year":"1994","genre":"Thriller, Crime","overview":"Historias entrelazadas de criminales en Los Ángeles."}'),
    (movies_list_id, 'El Club de la Lucha',           20, '550',    '{"poster_path":"/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg","year":"1999","genre":"Drama, Thriller","overview":"Un empleado insatisfecho forma un club de lucha clandestino con un vendedor de jabón."}'),
    (movies_list_id, 'Parásitos',                     18, '496243', '{"poster_path":"/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg","year":"2019","genre":"Comedy, Thriller, Drama","overview":"Una familia pobre se infiltra en la vida de una familia adinerada con consecuencias inesperadas."}'),
    (movies_list_id, 'Interstellar',                  16, '157336', '{"poster_path":"/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg","year":"2014","genre":"Adventure, Drama, Sci-Fi","overview":"Un grupo de exploradores viaja a través de un agujero de gusano para encontrar un nuevo hogar para la humanidad."}'),
    (movies_list_id, 'Blade Runner 2049',             13, '335984', '{"poster_path":"/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg","year":"2017","genre":"Sci-Fi, Drama","overview":"Un blade runner descubre un secreto que podría sumir a la sociedad en el caos."}'),
    (movies_list_id, '2001: Una Odisea del Espacio',  11, '62',     '{"poster_path":"/ve72VxNqjU9ft5djrMFrCDPnKa0.jpg","year":"1968","genre":"Sci-Fi, Mystery, Adventure","overview":"Una misión espacial a Júpiter se complica cuando la IA del nave se vuelve hostil."}'),
    (movies_list_id, 'Pozos de Ambición',              8, '7345',   '{"poster_path":"/fa0RDkAlCec0STeMNAhPaF89q6U.jpg","year":"2007","genre":"Drama","overview":"La historia de un ambicioso prospector de petróleo en California a principios del siglo XX."}'),
    (movies_list_id, 'El Gran Lebowski',               6, '115',    '{"poster_path":"/dH0X3V1ToNl7K8VCZ6e4tQBd5WL.jpg","year":"1998","genre":"Comedy, Crime","overview":"El Nota es confundido con un millonario del mismo nombre y se ve arrastrado a un extravagante secuestro."}');

  -- ── Travel ─────────────────────────────────────────────────
  INSERT INTO public.lists (name, emoji, list_type, owner_id)
  VALUES ('Próximos viajes', '✈️', NULL, target_user_id)
  RETURNING id INTO travel_list_id;

  INSERT INTO public.items (list_id, title, total_votes)
  VALUES
    (travel_list_id, 'Japón',        25),
    (travel_list_id, 'Islandia',     19),
    (travel_list_id, 'Corea del Sur',14),
    (travel_list_id, 'Tailandia',    10);

  -- ── Seed one "Votaste hoy" so the badge is visible on home ─
  SELECT id INTO top_series_item
  FROM public.items WHERE list_id = series_list_id ORDER BY total_votes DESC LIMIT 1;

  INSERT INTO public.votes (user_id, list_id, item_id, voted_date)
  VALUES (target_user_id, series_list_id, top_series_item, CURRENT_DATE)
  ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Update handle_new_user to support anonymous sign-in
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_anonymous THEN
    -- Anonymous / demo user: generate a unique username and seed demo data
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, 'demo_' || LEFT(NEW.id::text, 8))
    ON CONFLICT (id) DO NOTHING;

    PERFORM public.clone_demo_data(NEW.id);
  ELSE
    -- Regular sign-up
    INSERT INTO public.profiles (id, username)
    VALUES (NEW.id, COALESCE(SPLIT_PART(NEW.email, '@', 1), 'user'))
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Cleanup: daily deletion of anonymous users older than 24h
--    Requires the pg_cron extension to be enabled in the Supabase dashboard.
--    Run manually in the SQL editor after enabling the extension:
--
--    SELECT cron.schedule(
--      'cleanup-demo-users',
--      '0 3 * * *',
--      $$DELETE FROM auth.users WHERE is_anonymous = true AND created_at < NOW() - INTERVAL '24 hours'$$
--    );
