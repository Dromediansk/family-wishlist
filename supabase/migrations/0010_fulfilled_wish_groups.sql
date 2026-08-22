-- Which groups a handed-over gift came through.
--
-- Run this once in the Supabase SQL editor, after 0009_wish_groups.sql.
--
-- The two history pages span every group, exactly as /buying does, and until
-- now their rows said nothing about which group a gift reached through. There
-- is nothing left to join to by the time they run: fulfil_wish deletes the wish
-- in the same statement that writes the record, and wish_groups cascades away
-- with it. So the tags have to be captured at handover, in the record itself.
--
-- Non-destructive: one new column with a default, one new function, and two
-- function bodies. docs/content/history.md

begin;

-- Names, not ids, and copied rather than joined — the same reason owner_name
-- and giver_name are. A record of something that really happened must not
-- depend on a group either party may since have left, or that may since be
-- deleted. docs/setup/database.md#fulfilled_wishes
alter table fulfilled_wishes
  add column if not exists group_names text[] not null default '{}';

/**
 * Which groups does this wish reach that both of these two people stand in?
 *
 * 0009 asked that question as a yes/no, in wish_shares_group, because a claim
 * guard only needs to know whether the answer is empty. History needs the set
 * itself. Writing the join a second time would leave one rule in two places, so
 * the set is the primitive and wish_shares_group is redefined below as the
 * question asked of it — the same reason 0009 gave for its two callers sharing
 * one function rather than carrying a copy each.
 *
 * Both memberships are joined, not just the claimer's: nothing prunes
 * wish_groups when a membership goes, so a tag only one of the two reaches is
 * stale and must neither justify a claim nor be recorded as history.
 */
create or replace function shared_wish_groups(p_wish_id uuid, a uuid, b uuid)
returns setof uuid
language sql
stable
set search_path = public
as $$
  select wg.group_id
    from wish_groups wg
    join memberships ma on ma.group_id = wg.group_id and ma.user_id = a
    join memberships mb on mb.group_id = wg.group_id and mb.user_id = b
   where wg.wish_id = p_wish_id;
$$;

/**
 * Unchanged in meaning, and unchanged in signature so 0009's triggers and its
 * grants both still stand: only the body moves onto the set above.
 */
create or replace function wish_shares_group(p_wish_id uuid, a uuid, b uuid)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (select 1 from shared_wish_groups(p_wish_id, a, b));
$$;

/**
 * Hand a reserved wish over. Unchanged in shape from 0008 — `claimed_by_user_id
 * = p_giver_id` is still the entire guard, and both names still come from
 * scalar subqueries so a missing one trips `not null` and rolls the delete back
 * rather than losing the gift.
 *
 * What is new is group_names: the wish's tags, narrowed by shared_wish_groups
 * to the groups the owner AND the giver both stand in at this moment — the same
 * narrowing /buying renders, so the tags shown right before Darované are the
 * tags frozen into history.
 *
 * Reading wish_groups here is safe beside the delete above it. Data-modifying
 * CTEs share one snapshot and do not see each other's writes — the same rule
 * 0009's update_wish is written around — so the subquery sees the tags as they
 * stood before the cascade took them.
 *
 * coalesce, and not a `not null` to trip: an untagged record still reads, so an
 * empty array must never roll a real handover back.
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
    owner_id, owner_name, giver_id, giver_name,
    title, description, url, group_names
  )
  select r.owner_user_id,
         (select name from app_users where id = r.owner_user_id),
         p_giver_id,
         (select name from app_users where id = p_giver_id),
         r.title, r.description, r.url,
         coalesce((
           select array_agg(g.name order by g.name)
             from shared_wish_groups(p_wish_id, r.owner_user_id, p_giver_id) sg
             join groups g on g.id = sg
         ), '{}')
    from removed r
  returning id;
$$;

-- Only the new function needs a grant. Postgres hands EXECUTE to PUBLIC — every
-- role, service_role included — so the revoke has to be paired with one.
-- wish_shares_group and fulfil_wish keep the grants they already had:
-- `create or replace` at an unchanged signature does not reset them.
revoke execute on function shared_wish_groups(uuid, uuid, uuid)
  from public, anon, authenticated;
grant  execute on function shared_wish_groups(uuid, uuid, uuid)
  to service_role;

commit;

-- PostgREST caches the schema; without this the new column is invisible to the
-- select until it reloads.
notify pgrst, 'reload schema';
