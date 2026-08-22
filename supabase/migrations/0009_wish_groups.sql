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

-- ------------------------------------------------------- the peer rule, scoped

-- The wish-scoped successor to 0008's shares_group, which asked the same
-- question of the whole account and is dropped at the bottom of this file. Do
-- these two people share a group THIS WISH is tagged with?
--
-- Both memberships are checked, not just the claimer's: nothing prunes
-- wish_groups when a membership goes, so a tag can outlive the owner's own
-- membership in the group it names, and asking only about the claimer would
-- let that stale tag stand in for a shared group. Its two callers below — the
-- insert guard and the release sweep — have to agree on that or a claim could
-- survive that could no longer be made, so they ask one function rather than
-- carrying a copy each. The read side spells the same rule in wishVisibleTo
-- (src/lib/visibility.ts).
create or replace function wish_shares_group(p_wish_id uuid, a uuid, b uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
      from wish_groups wg
      join memberships ma on ma.group_id = wg.group_id and ma.user_id = a
      join memberships mb on mb.group_id = wg.group_id and mb.user_id = b
     where wg.wish_id = p_wish_id
  );
$$;

-- --------------------------------------------- the wish-specific claim guard

-- Replaces the old blanket "share any group" rule: a claim now requires the
-- claimer AND the owner to both be in one of THIS wish's tagged groups.
-- Same trigger binding as 0008 (wishes_check_claim_peer); only the body changes.
create or replace function check_claim_peer()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.claimed_by_user_id is not null
     and not wish_shares_group(new.id, new.claimed_by_user_id, new.owner_user_id)
  then
    raise exception 'claimer % and owner % share no group wish % is tagged with',
      new.claimed_by_user_id, new.owner_user_id, new.id;
  end if;
  return new;
end;
$$;

-- ------------------------------------------- releasing claims, sharpened

-- The claim survives only while wish_shares_group still holds for it. Either
-- party leaving is enough to release it, and so is the tag itself going away.
-- Same trigger binding as 0008 (memberships_release_claims); only the function
-- body changes.
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
     and not wish_shares_group(w.id, w.claimed_by_user_id, w.owner_user_id);
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

  -- Only the difference is written. The picker always submits the whole set,
  -- and rewriting it would re-run wish_groups_check_owner — one
  -- wishes-join-memberships probe per row — over tags that never changed. The
  -- `on conflict` also makes a group id repeated in p_group_ids harmless.
  delete from wish_groups
   where wish_id = v_id and group_id <> all (p_group_ids);

  insert into wish_groups (wish_id, group_id)
  select v_id, g from unnest(p_group_ids) as g
  on conflict do nothing;

  return v_id;
end;
$$;

revoke execute on function update_wish(uuid, uuid, text, text, text, uuid[])
  from public, anon, authenticated;
grant  execute on function update_wish(uuid, uuid, text, text, text, uuid[])
  to service_role;

revoke execute on function wish_shares_group(uuid, uuid, uuid)
  from public, anon, authenticated;
grant  execute on function wish_shares_group(uuid, uuid, uuid)
  to service_role;

-- ------------------------------------------------------- drop dead code

-- Both callers above moved to wish_shares_group, its wish-scoped successor;
-- dropping removes its grant/revoke too.
drop function shares_group(uuid, uuid);

commit;

-- PostgREST caches the schema; without this the new table 404s until reload.
notify pgrst, 'reload schema';
