-- Keep the denormalized counter in sync for every vote row mutation.
create or replace function public.sync_item_vote_total()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'INSERT' then
    update public.items
       set total_votes = total_votes + 1
     where id = new.item_id;
    return new;
  end if;

  update public.items
     set total_votes = greatest(0, total_votes - 1)
   where id = old.item_id;
  return old;
end;
$$;

drop trigger if exists votes_sync_item_total on public.votes;
create trigger votes_sync_item_total
after insert or delete on public.votes
for each row execute function public.sync_item_vote_total();

-- Repair counters that are lower than the vote history before new votes arrive.
-- Seeded historical totals are preserved when they are higher than the rows.
update public.items i
   set total_votes = greatest(
     i.total_votes,
     (select count(*)::integer from public.votes v where v.item_id = i.id)
   );

-- Cast, move, or revoke one daily vote without lost updates.
create or replace function public.cast_list_vote(
  p_list_id uuid,
  p_item_id uuid,
  p_voted_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  actor_id uuid := auth.uid();
  previous_item_id uuid;
begin
  if actor_id is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- Serialize votes for the same user/list/day. The unique constraint still
  -- protects the table, while this lock also makes the counter updates atomic.
  perform pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':' || p_list_id::text || ':' || p_voted_date::text, 0)
  );

  if not exists (
    select 1
    from public.lists l
    where l.id = p_list_id
      and (
        l.owner_id = actor_id
        or exists (
          select 1 from public.list_members lm
          where lm.list_id = p_list_id and lm.user_id = actor_id
        )
      )
  ) then
    raise exception 'Not a list member' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.items i
    where i.id = p_item_id and i.list_id = p_list_id
  ) then
    raise exception 'Item does not belong to this list' using errcode = '23503';
  end if;

  select v.item_id
    into previous_item_id
    from public.votes v
   where v.user_id = actor_id
     and v.list_id = p_list_id
     and v.voted_date = p_voted_date
   for update;

  -- The vote trigger adjusts items.total_votes for each delete/insert.
  if previous_item_id = p_item_id then
    delete from public.votes
     where user_id = actor_id
       and list_id = p_list_id
       and voted_date = p_voted_date;
    return null;
  end if;

  if previous_item_id is not null then
    delete from public.votes
     where user_id = actor_id
       and list_id = p_list_id
       and voted_date = p_voted_date;
  end if;

  insert into public.votes (user_id, list_id, item_id, voted_date)
  values (actor_id, p_list_id, p_item_id, p_voted_date);

  return p_item_id;
end;
$$;

revoke all on function public.cast_list_vote(uuid, uuid, date) from public;
grant execute on function public.cast_list_vote(uuid, uuid, date) to authenticated;
