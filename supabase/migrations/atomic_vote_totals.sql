-- Keep the cached score in sync with the votes table inside the same database
-- transaction. Clients must never calculate and write `total_votes` themselves.

create or replace function public.sync_item_vote_total()
returns trigger
language plpgsql
security definer
set search_path = public
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

-- Repair totals written by older versions of the clients before enabling the
-- trigger for new votes.
update public.items as item
set total_votes = (
  select count(*)::integer
  from public.votes
  where votes.item_id = item.id
);

create or replace function public.cast_list_vote(
  p_list_id uuid,
  p_item_id uuid,
  p_voted_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_item_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.lists
    where id = p_list_id
      and (
        owner_id = auth.uid()
        or exists (
          select 1
          from public.list_members
          where list_id = p_list_id and user_id = auth.uid()
        )
      )
  ) then
    raise exception 'You do not have access to this list' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.items
    where id = p_item_id and list_id = p_list_id
  ) then
    raise exception 'The item does not belong to this list' using errcode = '22023';
  end if;

  select item_id into previous_item_id
  from public.votes
  where user_id = auth.uid()
    and list_id = p_list_id
    and voted_date = p_voted_date;

  if previous_item_id = p_item_id then
    delete from public.votes
    where user_id = auth.uid()
      and list_id = p_list_id
      and voted_date = p_voted_date;
    return null;
  end if;

  if previous_item_id is not null then
    delete from public.votes
    where user_id = auth.uid()
      and list_id = p_list_id
      and voted_date = p_voted_date;
  end if;

  insert into public.votes (item_id, user_id, list_id, voted_date)
  values (p_item_id, auth.uid(), p_list_id, p_voted_date);

  return p_item_id;
end;
$$;

revoke all on function public.cast_list_vote(uuid, uuid, date) from public;
grant execute on function public.cast_list_vote(uuid, uuid, date) to authenticated;
