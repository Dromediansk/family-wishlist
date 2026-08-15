-- Family Wish List — Google sign-in
--
-- Run this once in the Supabase SQL editor, after 0001_init.sql.
--
--
-- !!  THIS FILE DELETES EVERY MEMBER AND EVERY WISH.  !!
--
-- Identity used to be a name you picked out of a list, stored in a cookie. It is
-- now a Google account. Those two things cannot be reconciled — an existing row
-- has no way to say which Google account it belongs to, and guessing by name
-- would hand someone else's list to whoever signed up with a matching name. So
-- the old rows go and everyone signs in fresh. Take a snapshot first if any of
-- the current wishes matter.
--
--
-- What does NOT change: the security model. Every table still has row level
-- security on with ZERO policies, and every read and write still happens
-- server-side with the service_role key. Supabase Auth is used here for one
-- thing only — answering "who is this person" — and never for table access.
--
-- This matters MORE now, not less. Browsers previously carried an anon key that
-- belonged to nobody. They now carry a real session for a real authenticated
-- user, so a policy added to `wishes` in a moment of weakness would leak further
-- than it would have before. The warning at the top of 0002_realtime.sql stands:
-- the "owner never sees their own claims" rule is enforced by the column list in
-- getWishListFor, which only works while the browser cannot query at all.

begin;

-- See the header. Wishes go with them, via the existing ON DELETE CASCADE.
truncate family_members cascade;

alter table family_members
  add column if not exists auth_user_id uuid unique
    references auth.users (id) on delete cascade,
  add column if not exists email text,
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'active'));

-- Names come from Google profiles now, and two people called Ján Novák are two
-- people. Identity is auth_user_id; the name is only a label on the card. Left
-- unique, a second family member with a common name could not sign up at all —
-- the trigger below would fail and Supabase would report a generic OAuth error.
alter table family_members drop constraint if exists family_members_name_key;

create index if not exists family_members_status_idx on family_members (status);

commit;


-- Provisioning: one family_members row per auth user, created by the database.
--
-- This deliberately does not live in the /auth/callback route. Doing it there
-- leaves a hole — a signed-in user whose insert failed has a session and no
-- member row, and every page then has to cope with that state. A trigger makes
-- it impossible: you cannot exist in auth.users without existing here.
--
-- It also settles the bootstrap race. The first person to sign in has to become
-- an admin, or nobody can ever approve anybody and the app is a locked door with
-- the key inside. Two people signing in at the same instant would both read
-- "there are no members yet" in application code; inside the trigger, the row
-- lock on the insert means one of them sees the other's row.
create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first boolean;
  display_name text;
begin
  select not exists (select 1 from family_members) into is_first;

  -- Google supplies full_name; other providers and some Google accounts only
  -- have name. Fall back to the local part of the email so the column's
  -- not-null and length checks always hold, whatever the provider sends.
  display_name := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Bez mena'
  );

  insert into family_members (auth_user_id, email, name, role, status)
  values (
    new.id,
    new.email,
    left(display_name, 50),
    case when is_first then 'admin' else 'member' end,
    -- Everyone but the very first person waits for an admin to let them in.
    -- Supabase does not restrict which Google accounts may complete the OAuth
    -- flow, so this is the actual door.
    case when is_first then 'active' else 'pending' end
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_auth_user();
