-- =============================================
-- RANKIT — Add Sharing / Collaboration
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- =============================================

-- 1. Función RPC para buscar usuario por email
--    Usa SECURITY DEFINER para acceder a auth.users
--    sin exponer emails en la tabla profiles
CREATE OR REPLACE FUNCTION public.get_profile_by_email(lookup_email TEXT)
RETURNS TABLE(id UUID, username TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT p.id, p.username
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE LOWER(u.email) = LOWER(lookup_email)
      AND u.id != auth.uid();
END;
$$;

-- 2. Permitir que cualquier usuario autenticado llame la función
GRANT EXECUTE ON FUNCTION public.get_profile_by_email(TEXT) TO authenticated;

-- 3. Corregir política RLS de list_members para que el owner
--    pueda ver todos los miembros de sus listas.
--    Usamos SECURITY DEFINER para evitar recursión infinita:
--    lists → list_members → lists → ♾️
CREATE OR REPLACE FUNCTION public.get_list_owner_id(p_list_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT owner_id FROM public.lists WHERE id = p_list_id;
$$;

DROP POLICY IF EXISTS "Members can view list memberships" ON public.list_members;

CREATE POLICY "Members can view list memberships"
  ON public.list_members FOR SELECT USING (
    auth.uid() = user_id
    OR public.get_list_owner_id(list_id) = auth.uid()
  );

-- 4. Política de DELETE para items (miembros pueden borrar)
DROP POLICY IF EXISTS "Members can delete items" ON public.items;

CREATE POLICY "Members can delete items"
  ON public.items FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.lists l
      WHERE l.id = items.list_id
        AND (
          l.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.list_members lm
            WHERE lm.list_id = items.list_id AND lm.user_id = auth.uid()
          )
        )
    )
  );

-- 5. Habilitar Realtime en list_members
ALTER PUBLICATION supabase_realtime ADD TABLE public.list_members;
