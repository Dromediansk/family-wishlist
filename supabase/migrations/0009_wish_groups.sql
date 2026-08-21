-- Per-wish group visibility.
--
-- Adds wish_groups, the join table that decides which of the owner's groups
-- can see one particular wish. Backfills every existing wish to every group
-- its owner is in today, so nobody loses access the moment this ships.
-- docs/superpowers/specs/2026-08-21-per-wish-group-visibility-design.md
--
-- Non-destructive: no row is deleted and no column is dropped, except the
-- now-dead shares_group() function at the end.

begin;

-- ------------------------------------------------------------- the table

create table wish_groups (
  wish_id    uuid not null references wishes (id) on delete cascade,
  group_id   uuid not null references groups (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (wish_id, group_id)
);

create index wish_groups_group_idx on wish_groups (group_id);

-- Deliberately no policies, exactly as every other table.
alter table wish_groups enable row level security;

-- ----------------------------------------------------------- backfill

-- Every wish is tagged with every group its owner is in today, so nobody
-- who could see a wish yesterday loses access the moment this ships.
insert into wish_groups (wish_id, group_id)
select w.id, m.group_id
  from wishes w
  join memberships m on m.user_id = w.owner_user_id
on conflict do nothing;

-- ---------------------------------------------------- the ownership guard

-- A wish can only be tagged with a group its owner actually belongs to.
-- Unstorable in Postgres, not merely checked in the action.
create or replace function check_wish_group_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
      from wishes w
      join memberships m on m.group_id = new.group_id
     where w.id = new.wish_id and m.user_id = w.owner_user_id
  ) then
    raise exception 'wish % owner is not a member of group %',
      new.wish_id, new.group_id;
  end if;
  return new;
end;
$$;

drop trigger if exists wish_groups_check_owner on wish_groups;
create trigger wish_groups_check_owner
  before insert on wish_groups
  for each row
  execute function check_wish_group_owner();

-- --------------------------------------------- the wish-specific claim guard

-- Replaces the old blanket "share any group" rule: a claim now requires the
-- claimer to be in one of THIS wish's tagged groups, not merely any group in
-- common with the owner. Same trigger binding as 0008 (wishes_check_claim_peer);
-- only the function body changes.
create or replace function check_claim_peer()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.claimed_by_user_id is not null
     and not exists (
       select 1
         from wish_groups wg
         join memberships m on m.group_id = wg.group_id
        where wg.wish_id = new.id and m.user_id = new.claimed_by_user_id
     ) then
    raise exception 'claimer % is not in any group wish % is tagged with',
      new.claimed_by_user_id, new.id;
  end if;
  return new;
end;
$$;

-- ------------------------------------------- releasing claims, sharpened

-- Strictly finer than the old version: if owner and claimer no longer share
-- any group at all, they certainly don't share one of the wish's tagged
-- groups either, so this subsumes it. Same trigger binding as 0008
-- (memberships_release_claims); only the function body changes.
create or replace function release_orphaned_claims()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update wishes w
     set claimed_by_user_id = null
   where w.claimed_by_user_id is not null
     and (w.claimed_by_user_id = old.user_id or w.owner_user_id = old.user_id)
     and not exists (
       select 1
         from wish_groups wg
         join memberships m
           on m.group_id = wg.group_id and m.user_id = w.claimed_by_user_id
        where wg.wish_id = w.id
     );
  return old;
end;
$$;

-- ------------------------------------------------------- editing atomically

-- Rewrites a wish's text fields and its group tags in one guarded statement,
-- so a claim landing mid-edit cannot leave the two halves inconsistent. Plain
-- imperative plpgsql on purpose: a `with ... as (delete ...) insert ...` CTE
-- against the same table does not guarantee the delete runs before the
-- insert, since Postgres data-modifying CTEs share one snapshot and don't see
-- each other's writes.
create or replace function update_wish(
  p_wish_id     uuid,
  p_owner_id    uuid,
  p_title       text,
  p_description text,
  p_url         text,
  p_group_ids   uuid[]
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  update wishes
     set title = p_title, description = p_description, url = p_url
   where id = p_wish_id
     and owner_user_id = p_owner_id
     and claimed_by_user_id is null
  returning id into v_id;

  if v_id is null then
    return null;
  end if;

  delete from wish_groups where wish_id = v_id;

  insert into wish_groups (wish_id, group_id)
  select v_id, g from unnest(p_group_ids) as g;

  return v_id;
end;
$$;

revoke execute on function update_wish(uuid, uuid, text, text, text, uuid[])
  from public, anon, authenticated;
grant  execute on function update_wish(uuid, uuid, text, text, text, uuid[])
  to service_role;

-- ------------------------------------------------------- drop dead code

-- Both callers above stopped using it; dropping removes its grant/revoke too.
drop function shares_group(uuid, uuid);

commit;

-- PostgREST caches the schema; without this the new table 404s until reload.
notify pgrst, 'reload schema';
