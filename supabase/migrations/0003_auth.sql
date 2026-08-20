-- Family Wish List — Google sign-in
--
-- Run this once in the Supabase SQL editor, after 0001_init.sql.
--
--
-- !!  THIS FILE DELETES EVERY MEMBER AND EVERY WISH.  !!
--
-- Identity moved from a name in a cookie to a Google account, and an existing
-- row has no way to say which account it belongs to. Take a snapshot first if
-- any current wishes matter. docs/setup/database.md#migrations
--
-- The security model does NOT change, and matters more now, not less: browsers
-- now carry a real authenticated session, so a policy added to `wishes` would
-- leak further than it would have before. Supabase Auth answers "who is this
-- person" and never touches a table. docs/content/privacy-rule.md

begin;

-- See the header. Wishes go with them, via the existing ON DELETE CASCADE.
truncate family_members cascade;

alter table family_members
  add column if not exists auth_user_id uuid unique
    references auth.users (id) on delete cascade,
  add column if not exists email text,
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'active'));

-- Identity is auth_user_id; the name is only a label on the card. Left unique, a
-- second member with a common name could not sign up at all — the trigger below
-- would fail and Supabase would report a generic OAuth error.
alter table family_members drop constraint if exists family_members_name_key;

create index if not exists family_members_status_idx on family_members (status);

commit;


-- Provisioning: one family_members row per auth user, created by the database
-- rather than by /auth/callback. A trigger leaves no window in which a signed-in
-- user has no member row, and its row lock settles the first-admin race.
-- docs/content/membership.md#one-row-per-google-account
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

  -- Google supplies full_name; some accounts only have name. Fall back to the
  -- email's local part so the column's checks hold whatever arrives.
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
