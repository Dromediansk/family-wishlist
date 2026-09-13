-- A private note per person per group.
--
-- Run this once in the Supabase SQL editor, after 0010_fulfilled_wish_groups.sql.
--
-- Claiming says who is buying a wish. Nothing held the thinking that comes
-- before it — what to buy whom, what to ask about, what it may cost — so this
-- does. A note is readable only by the account that wrote it, which is why no
-- part of it is an enforcement point for the privacy rule: no note is ever
-- served to a list owner in the first place.
--
-- Non-destructive: one new table, nothing altered and nothing dropped.

begin;

create table group_notes (
  user_id    uuid not null,
  group_id   uuid not null,
  -- Emptying a note deletes the row, so an empty body is not a state this
  -- table has. Enforced here rather than only in the action, which lets the
  -- Notes mark ask whether the row exists and nothing more.
  body       text not null check (body <> '' and char_length(body) <= 4000),

  primary key (user_id, group_id),

  -- Not two separate foreign keys to app_users and groups: this one borrows the
  -- composite unique that memberships already carries, so a note cannot outlive
  -- the membership that gave it meaning. Removed from the group, group deleted,
  -- account deleted — the note goes with it, and rejoining starts empty.
  foreign key (group_id, user_id)
    references memberships (group_id, user_id) on delete cascade
);

-- Deliberately no policies, exactly as every other table.
alter table group_notes enable row level security;

commit;
