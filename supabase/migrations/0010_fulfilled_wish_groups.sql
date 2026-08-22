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
-- Non-destructive: one new column with a default, and one function body.
-- docs/content/history.md

begin;

-- Names, not ids, and copied rather than joined — the same reason owner_name
-- and giver_name are. A record of something that really happened must not
-- depend on a group either party may since have left, or that may since be
-- deleted. docs/setup/database.md#fulfilled_wishes
alter table fulfilled_wishes
  add column if not exists group_names text[] not null default '{}';

/**
 * Hand a reserved wish over. Unchanged in shape from 0008 — `claimed_by_user_id
 * = p_giver_id` is still the entire guard, and both names still come from
 * scalar subqueries so a missing one trips `not null` and rolls the delete back
 * rather than losing the gift.
 *
 * What is new is group_names: the wish's tags, narrowed to the groups the owner
 * AND the giver both stand in at this moment — the same narrowing /buying
 * renders, so the tags shown right before Darované are the tags frozen into
 * history. Both memberships are joined, not just the giver's, for the reason
 * wish_shares_group gives: nothing prunes wish_groups when a membership goes,
 * so a tag only one party reaches is stale and must not be recorded.
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
             from wish_groups wg
             join groups g       on g.id = wg.group_id
             join memberships mo on mo.group_id = wg.group_id
                                and mo.user_id = r.owner_user_id
             join memberships mg on mg.group_id = wg.group_id
                                and mg.user_id = p_giver_id
            where wg.wish_id = p_wish_id
         ), '{}')
    from removed r
  returning id;
$$;

-- No revoke/grant pair here: the signature is unchanged, so `create or replace`
-- leaves 0008's grants exactly as they were — service_role only.

commit;

-- PostgREST caches the schema; without this the new column is invisible to the
-- select until it reloads.
notify pgrst, 'reload schema';
