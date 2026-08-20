-- Family Wish List — many groups, one account
--
-- Run this once in the Supabase SQL editor, after 0007_fulfilled_wishes.sql.
--
--
-- !!  THIS MIGRATION RESHAPES EVERY TABLE. TAKE A SNAPSHOT FIRST.  !!
--
-- It is written to be non-destructive: every member becomes an app_users row,
-- every active member becomes a membership in one group, and no wish is
-- touched. But it drops family_members at the end, and there is no way back
-- without the snapshot. docs/setup/database.md#migrations
--
-- The security model does not change. RLS stays on with zero policies on all
-- four new tables, service_role still does every read and write, and the two
-- new functions are revoked from PUBLIC exactly as fulfil_wish is.
-- docs/content/privacy-rule.md
--
-- The trick that makes this cheap: app_users.id inherits family_members.id, so
-- every existing wishes.member_id and fulfilled_wishes.owner_id/giver_id value
-- stays valid. The columns are renamed and re-pointed; no value is rewritten.

begin;

-- ---------------------------------------------------------------- new tables

create table if not exists app_users (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  email        text,
  -- The seed name from Google: copied into each new membership as its starting
  -- label, and the snapshot fulfil_wish writes into history.
  name         text not null check (char_length(btrim(name)) between 1 and 50),
  created_at   timestamptz not null default now()
);

create table if not exists groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  -- Only reason this column exists: the per-account creation cap has to be
  -- countable. Nulled rather than cascaded, so deleting an account never takes
  -- a group other people are still using.
  created_by uuid references app_users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups (id)    on delete cascade,
  user_id    uuid not null references app_users (id) on delete cascade,
  -- A per-group label: "Miro" to the family, "Miroslav Pillár" to colleagues.
  name       text not null check (char_length(btrim(name)) between 1 and 50),
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now(),

  unique (group_id, user_id),
  -- Not redundant with the primary key: it is the target a composite foreign
  -- key needs in order to prove "this membership is in that group".
  unique (id, group_id)
);

create table if not exists invites (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references groups (id) on delete cascade,
  -- Stored in plaintext so an admin can re-copy a link they already sent.
  -- Hashing would defend only against a read-only leak of a database that
  -- already holds every wish this token would grant access to.
  token      text not null unique,
  created_by uuid not null,
  expires_at timestamptz,
  max_uses   integer check (max_uses is null or max_uses > 0),
  uses       integer not null default 0,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),

  -- An invite cannot be created by someone who is not in the group it admits
  -- people to. Unstorable in Postgres, not merely checked in TypeScript.
  constraint invites_creator_in_group
    foreign key (created_by, group_id) references memberships (id, group_id)
    on delete cascade
);

create index if not exists memberships_user_idx    on memberships (user_id);
create index if not exists memberships_group_idx   on memberships (group_id);
create index if not exists invites_group_idx       on invites (group_id);
create index if not exists groups_created_by_idx   on groups (created_by);

-- ------------------------------------------------------------------ backfill

-- Every member becomes an identity, pending ones included: they keep their
-- Google account and land on /start with no group, rather than being deleted.
insert into app_users (id, auth_user_id, email, name)
select id, auth_user_id, email, name
  from family_members
on conflict (id) do nothing;

-- The one existing family. created_by is the sitting admin, so the creation cap
-- counts a consistent state from the first day.
insert into groups (id, name, created_by)
select '00000000-0000-4000-8000-000000000001',
       'Naša rodina',
       (select id
          from family_members
         where status = 'active' and role = 'admin'
         order by created_at
         limit 1)
on conflict (id) do nothing;

-- Only approved members were ever in the family, so only they get a membership.
-- Their name, role and join date come across unchanged.
insert into memberships (group_id, user_id, name, role, created_at)
select '00000000-0000-4000-8000-000000000001', id, name, role, created_at
  from family_members
 where status = 'active'
on conflict (group_id, user_id) do nothing;

-- ------------------------------------------------------- re-point the wishes

alter table wishes rename column member_id  to owner_user_id;
alter table wishes rename column claimed_by to claimed_by_user_id;

alter index if exists wishes_member_id_idx  rename to wishes_owner_user_id_idx;
alter index if exists wishes_claimed_by_idx rename to wishes_claimed_by_user_id_idx;

/*
 * Foreign keys are dropped by discovery rather than by name. Supabase's
 * generated constraint names are not reliably what you would predict, and a
 * guess that misses would leave a live reference to a table this migration is
 * about to drop.
 */
do $$
declare
  constraint_name text;
begin
  for constraint_name in
    select conname
      from pg_constraint
     where conrelid = 'wishes'::regclass and contype = 'f'
  loop
    execute format('alter table wishes drop constraint %I', constraint_name);
  end loop;

  for constraint_name in
    select conname
      from pg_constraint
     where conrelid = 'fulfilled_wishes'::regclass and contype = 'f'
  loop
    execute format('alter table fulfilled_wishes drop constraint %I', constraint_name);
  end loop;
end;
$$;

alter table wishes
  add constraint wishes_owner_user_id_fkey
    foreign key (owner_user_id) references app_users (id) on delete cascade,
  add constraint wishes_claimed_by_user_id_fkey
    foreign key (claimed_by_user_id) references app_users (id) on delete set null;

alter table fulfilled_wishes
  add constraint fulfilled_wishes_owner_id_fkey
    foreign key (owner_id) references app_users (id) on delete set null,
  add constraint fulfilled_wishes_giver_id_fkey
    foreign key (giver_id) references app_users (id) on delete set null;

-- A column rename propagates into check-constraint expressions, so no_self_claim
-- and claim_consistent follow by themselves. A plpgsql body is stored as text
-- and does NOT — this one names the old column and would break in silence.
create or replace function clear_claim_timestamp()
returns trigger
language plpgsql
as $$
begin
  if new.claimed_by_user_id is null then
    new.claimed_at := null;
  end if;
  return new;
end;
$$;

-- ------------------------------------------------------------ the peer rules

-- Do these two people share at least one group?
create or replace function shares_group(a uuid, b uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
      from memberships ma
      join memberships mb on mb.group_id = ma.group_id
     where ma.user_id = a and mb.user_id = b
  );
$$;

-- Every user a viewer is allowed to see. Self-inclusive through the join, which
-- means it returns NOTHING for a user who belongs to no group — the caller in
-- src/lib/data/access.ts adds the viewer's own id unconditionally.
create or replace function peer_user_ids(p_user_id uuid)
returns setof uuid
language sql
stable
set search_path = public
as $$
  select distinct m2.user_id
    from memberships m1
    join memberships m2 on m2.group_id = m1.group_id
   where m1.user_id = p_user_id;
$$;

/*
 * A claim between two people who share no group is unstorable, whatever the app
 * code forgot. This is the write-side backstop the read side cannot have: a
 * trigger is not a policy, so the zero-policy wall is untouched.
 */
create or replace function check_claim_peer()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.claimed_by_user_id is not null
     and not shares_group(new.claimed_by_user_id, new.owner_user_id) then
    raise exception 'claimer % and owner % share no group',
      new.claimed_by_user_id, new.owner_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists wishes_check_claim_peer on wishes;
create trigger wishes_check_claim_peer
  before insert or update on wishes
  for each row
  execute function check_claim_peer();

/*
 * Leaving a group releases the claims that group made possible, in both
 * directions. Fires on any membership delete, whoever caused it — an admin
 * removing somebody, or a group being deleted and cascading.
 *
 * Nulling claimed_by_user_id leaves clear_claim_timestamp to null claimed_at,
 * exactly as ON DELETE SET NULL already relies on.
 */
create or replace function release_orphaned_claims()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  update wishes
     set claimed_by_user_id = null
   where (claimed_by_user_id = old.user_id
          and not shares_group(old.user_id, owner_user_id))
      or (owner_user_id = old.user_id
          and claimed_by_user_id is not null
          and not shares_group(old.user_id, claimed_by_user_id));
  return old;
end;
$$;

drop trigger if exists memberships_release_claims on memberships;
create trigger memberships_release_claims
  after delete on memberships
  for each row
  execute function release_orphaned_claims();

-- ----------------------------------------------------- the rewritten functions

/**
 * Hand a reserved wish over. Unchanged in shape: `claimed_by_user_id =
 * p_giver_id` is still the entire guard, and the names still come from scalar
 * subqueries so that a missing name trips `owner_name not null` and rolls the
 * delete back rather than losing the gift.
 *
 * The names come from app_users, not from a membership. A historical record
 * must not depend on a group that may since have been left or deleted.
 */
create or replace function fulfil_wish(p_wish_id uuid, p_giver_id uuid)
returns uuid
language sql
set search_path = public
as $$
  with removed as (
    delete from wishes
     where id = p_wish_id
       and claimed_by_user_id = p_giver_id
    returning owner_user_id, title, description, url
  )
  insert into fulfilled_wishes (
    owner_id, owner_name, giver_id, giver_name, title, description, url
  )
  select r.owner_user_id,
         (select name from app_users where id = r.owner_user_id),
         p_giver_id,
         (select name from app_users where id = p_giver_id),
         r.title, r.description, r.url
    from removed r
  returning id;
$$;

/**
 * Provisioning, reduced to one row. It no longer decides roles and no longer
 * creates families: a signed-in user with no membership is a legal state, and
 * /start is what serves it.
 */
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Bez mena'
  );

  insert into app_users (auth_user_id, email, name)
  values (new.id, new.email, left(display_name, 50));

  return new;
end;
$$;

-- ---------------------------------------------------------------- grants, RLS

-- Postgres grants EXECUTE on a new function to PUBLIC, which includes anon.
-- PUBLIC also includes service_role, so every revoke is paired with a grant.
revoke execute on function shares_group(uuid, uuid) from public, anon, authenticated;
revoke execute on function peer_user_ids(uuid)      from public, anon, authenticated;
revoke execute on function fulfil_wish(uuid, uuid)  from public, anon, authenticated;
grant  execute on function shares_group(uuid, uuid) to service_role;
grant  execute on function peer_user_ids(uuid)      to service_role;
grant  execute on function fulfil_wish(uuid, uuid)  to service_role;

-- Deliberately no policies, exactly as everywhere else. See 0001_init.sql.
alter table app_users   enable row level security;
alter table groups      enable row level security;
alter table memberships enable row level security;
alter table invites     enable row level security;

-- --------------------------------------------------------------- the old table

drop table family_members;

commit;

-- PostgREST caches the schema; without this the new tables 404 until it reloads.
notify pgrst, 'reload schema';
