-- Family Wish List — gifts that were actually handed over
--
-- Run this once in the Supabase SQL editor, after 0005_drop_claim_notices.sql.
-- It changes no existing table.
--
-- Until now a claim had no end: the wish stayed on its owner's list forever and
-- the reservation stayed on the buyer's page forever. This table is where a
-- claim goes when the gift has been given.
--
-- It is also where the app's one rule stops applying. A claim is a secret; a
-- gift that has been handed over is not, so this table names the giver to the
-- person they gave to. The secret ends here and nowhere else — no cron, no
-- admin override, no date. docs/content/privacy-rule.md#when-the-secret-ends

begin;

create table if not exists fulfilled_wishes (
  id           uuid primary key default gen_random_uuid(),

  -- Ids answer "whose history is this". Names are copied rather than joined so
  -- that removing a member takes neither their own record nor the other
  -- party's with them.
  owner_id     uuid references family_members (id) on delete set null,
  owner_name   text not null,
  giver_id     uuid references family_members (id) on delete set null,
  giver_name   text not null,

  -- The wish itself, copied: the same statement that writes this row deletes the
  -- row it describes. A snapshot, not a duplicate — why a wish_id reference is
  -- the wrong shape here is in docs/setup/database.md#fulfilled_wishes.
  title        text not null,
  description  text,
  url          text,

  fulfilled_at timestamptz not null default now(),

  -- Claiming your own wish is already unstorable; this says so on this side too.
  constraint no_self_gift
    check (giver_id is null or owner_id is null or giver_id <> owner_id)
);

-- Both reads are "one person's rows, newest first", so each index is in exactly
-- that shape and neither read needs a sort step.
create index if not exists fulfilled_wishes_giver_idx
  on fulfilled_wishes (giver_id, fulfilled_at desc);
create index if not exists fulfilled_wishes_owner_idx
  on fulfilled_wishes (owner_id, fulfilled_at desc);

/**
 * Hand a reserved wish over: delete it and record it, in one statement.
 *
 * `claimed_by = p_giver_id` is the entire guard. Only the holder matches, and
 * only while they still hold it — the same race-free shape as claimWish.
 *
 * The two names come from scalar subqueries rather than joins on purpose. A
 * join that finds nothing yields no row to insert, and the delete in the CTE
 * would still stand, so the gift would vanish unrecorded. A subquery that finds
 * nothing yields null, which trips `owner_name not null` and rolls the whole
 * statement back, delete included. A loud error beats a lost gift.
 */
create or replace function fulfil_wish(p_wish_id uuid, p_giver_id uuid)
returns uuid
language sql
set search_path = public
as $$
  with removed as (
    delete from wishes
     where id = p_wish_id
       and claimed_by = p_giver_id
    returning member_id, title, description, url
  )
  insert into fulfilled_wishes (
    owner_id, owner_name, giver_id, giver_name, title, description, url
  )
  select r.member_id,
         (select name from family_members where id = r.member_id),
         p_giver_id,
         (select name from family_members where id = p_giver_id),
         r.title, r.description, r.url
    from removed r
  returning id;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC. Left alone, anyone
-- holding the anon key could call this from devtools and delete a claimed wish
-- while forging a history row — straight past the zero-policy wall, because a
-- function is not a table.
--
-- PUBLIC is every role, service_role included, so the revoke must be followed
-- by an explicit grant or the app loses the function it just created.
revoke execute on function fulfil_wish(uuid, uuid) from public, anon, authenticated;
grant  execute on function fulfil_wish(uuid, uuid) to service_role;

-- Deliberately no policies, exactly as everywhere else. See 0001_init.sql.
alter table fulfilled_wishes enable row level security;

commit;

-- PostgREST caches the schema; without this the RPC 404s until it reloads.
notify pgrst, 'reload schema';
