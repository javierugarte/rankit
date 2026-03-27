-- Clean up orphaned list_members rows left behind by deleted users or lists.
-- The foreign keys already have ON DELETE CASCADE, so this is a one-time fix
-- for rows that became orphaned before the cascade was in place (e.g. from
-- anonymous demo users whose auth.users record was deleted externally).

DELETE FROM public.list_members
WHERE list_id NOT IN (SELECT id FROM public.lists);

DELETE FROM public.list_members
WHERE user_id NOT IN (SELECT id FROM public.profiles);
