-- Family Wish List — an optional "needed by" day on a wish
--
-- Run this once in the Supabase SQL editor, after
-- 0013_release_orphaned_claims_definer.sql.
--
-- A calendar day, not a moment: `date`, no time, no zone. Informational only —
-- nothing reads it to release, fulfil or hide a wish, because the one rule
-- lets no date end the secret. There is no CHECK against the past: "today"
-- is not something a constraint can know, so the Server Action owns it.
--
-- update_wish gains two parameters. `p_set_needed_by = false` keeps the stored
-- value, which is what lets an owner fix a typo on an overdue wish without
-- re-dating it. The guard is unchanged from 0009, so a reserved wish's date
-- freezes with the rest of it.
--
-- A new signature is a new function, and it owes its own revoke/grant pair.
-- The 6-argument one from 0009 is kept, not dropped: migrations reach
-- production by hand, ahead of the deploy, and the code still running then
-- calls it. It leaves needed_by untouched. A later migration drops it once
-- nothing calls it.
-- docs/decisions/wishes-claims-history.md#a-needed-by-date

begin;

alter table wishes
  add column if not exists needed_by date;

create function update_wish(
  p_wish_id       uuid,
  p_owner_id      uuid,
  p_title         text,
  p_description   text,
  p_url           text,
  p_group_ids     uuid[],
  p_set_needed_by boolean,
  p_needed_by     date
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  update wishes
     set title       = p_title,
         description = p_description,
         url         = p_url,
         needed_by   = case when p_set_needed_by then p_needed_by else needed_by end
   where id = p_wish_id
     and owner_user_id = p_owner_id
     and claimed_by_user_id is null
  returning id into v_id;

  if v_id is null then
    return null;
  end if;

  -- Only the difference is written; see 0009.
  delete from wish_groups
   where wish_id = v_id and group_id <> all (p_group_ids);

  insert into wish_groups (wish_id, group_id)
  select v_id, g from unnest(p_group_ids) as g
  on conflict do nothing;

  return v_id;
end;
$$;

revoke execute on function update_wish(uuid, uuid, text, text, text, uuid[], boolean, date)
  from public, anon, authenticated;
grant  execute on function update_wish(uuid, uuid, text, text, text, uuid[], boolean, date)
  to service_role;

commit;

-- PostgREST caches the schema; without this the new signature 404s until reload.
notify pgrst, 'reload schema';
