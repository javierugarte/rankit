-- Add list_type to lists (e.g., 'movies', null = no service)
alter table public.lists
  add column if not exists list_type text;

-- Add external service fields to items
alter table public.items
  add column if not exists external_id text,
  add column if not exists external_data jsonb;
