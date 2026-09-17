-- Family Wish List — the activity bell's two moments, per account
--
-- Run this once in the Supabase SQL editor, after 0011_group_notes.sql.
-- It creates no table and changes no existing column.
--
-- The activity feed itself stores nothing: it is four reads over rows that
-- already exist, merged per viewer at render time. These two columns are the
-- only state it needs, and they are not the same moment.
--
-- `activity_from` — when this reader arrived. The feed never looks past it,
-- so nothing that happened before the account could have seen it is ever an
-- event, not even a seen one. Set once and never moved. `default now()` is the
-- whole backfill: Postgres fills the existing rows as it adds the column, so
-- every account alive when this migration runs is stamped with that moment,
-- and every later signup with its own. That is what stops the update itself
-- from arriving as twenty things to read.
--
-- `activity_seen_at` — when they last opened the bell, which is what turns the
-- rows above the floor into an unread count. It advances on every open, which
-- is exactly why it cannot also be the floor: a feed bounded by it would empty
-- itself the moment you looked at it. Null means "never opened", and with the
-- floor in place that now honestly counts everything — hence no default.
--
-- Both on app_users rather than memberships: the feed spans every group the
-- viewer is in, so one dropdown would otherwise clear N markers in N writes.
--
-- Deliberately no policies, exactly as everywhere else. See 0001_init.sql.

begin;

alter table app_users
  add column if not exists activity_seen_at timestamptz,
  add column if not exists activity_from    timestamptz not null default now();

commit;
