-- Family Wish List — let account deletion release claims too
--
-- Run this once in the Supabase SQL editor, after 0012_activity_seen.sql.
-- It creates no table and changes no existing column.
--
-- release_orphaned_claims (0008, rewritten in 0009) fires after delete on
-- memberships and has always run fine from the app: an admin removing a
-- member, or a group cascading away, both happen through service_role, which
-- already holds every table grant. Deleting the auth user itself does not —
-- GoTrue's admin API runs as supabase_auth_admin, which the ON DELETE CASCADE
-- from auth.users through app_users into memberships tolerates (referential
-- actions are not privilege-checked), but the AFTER DELETE trigger it then
-- fires is an ordinary user trigger and is privilege-checked, and
-- supabase_auth_admin holds no grant on wishes. The e2e `world` fixture is
-- the first caller to ever delete an account with a live membership, and
-- exposed it: "permission denied for table wishes" out of admin.deleteUser.
--
-- The fix already has a precedent one function away: handle_new_auth_user
-- (0003) is `security definer` for the identical reason — it too runs off an
-- auth.users trigger, under supabase_auth_admin. This function needs the
-- same, so the release runs as its owner regardless of who deleted the
-- membership. The body is unchanged from 0009.
--
-- No revoke/grant pair is owed, even though every new function owes one
-- (docs/setup/database.md#row-level-security): `create or replace` at an
-- unchanged signature keeps the trigger and the privileges the function
-- already had, which is what 0010 says of wish_shares_group.
--
-- `set search_path = public` omits pg_temp, matching handle_new_auth_user
-- (0003) — the other security definer function on an auth.users path. The two
-- should only ever be tightened together, so the pair cannot drift.

begin;

create or replace function release_orphaned_claims()
returns trigger
language plpgsql
security definer
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

commit;
