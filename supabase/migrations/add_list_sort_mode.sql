alter table public.lists
  add column if not exists sort_mode text not null default 'votes'
  constraint lists_sort_mode_check check (sort_mode in ('votes', 'rating'));
