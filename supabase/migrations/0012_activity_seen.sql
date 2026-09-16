-- Family Wish List — when each account last opened the activity bell
--
-- Run this once in the Supabase SQL editor, after 0011_group_notes.sql.
-- It creates no table and changes no existing column.
--
-- The activity feed itself stores nothing: it is four reads over rows that
-- already exist, merged per viewer at render time. This column is the only
-- state it needs — the moment the reader last looked, which is what turns a
-- list of recent changes into an unread count.
--
-- Null means "never looked", so a new account opens the bell to the whole
-- window rather than to an empty list. That is why there is no default.
--
-- On app_users rather than memberships: the feed spans every group the viewer
-- is in, so one dropdown would otherwise clear N markers in N writes.
--
-- Deliberately no policies, exactly as everywhere else. See 0001_init.sql.

begin;

alter table app_users
  add column if not exists activity_seen_at timestamptz;

commit;
