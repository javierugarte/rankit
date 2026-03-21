-- =============================================
-- FIX: Recursión infinita en RLS
-- La política de list_members que referencia lists
-- crea un ciclo: lists → list_members → lists → ♾️
--
-- Solución: función SECURITY DEFINER que consulta
-- lists SIN RLS, rompiendo el ciclo.
-- =============================================

-- Función auxiliar: devuelve el owner_id de una lista
-- SECURITY DEFINER omite RLS al consultar lists → sin recursión
CREATE OR REPLACE FUNCTION public.get_list_owner_id(p_list_id UUID)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT owner_id FROM public.lists WHERE id = p_list_id;
$$;

-- Reemplazar la política problemática
DROP POLICY IF EXISTS "Members can view list memberships" ON public.list_members;

CREATE POLICY "Members can view list memberships"
  ON public.list_members FOR SELECT USING (
    auth.uid() = user_id
    OR public.get_list_owner_id(list_id) = auth.uid()
  );
