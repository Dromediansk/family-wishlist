-- Family Wish List — telling the buyer when a reserved wish changes
--
-- Run this once in the Supabase SQL editor, after 0003_auth.sql.
-- It deletes nothing and changes no existing table.
--
-- The problem: an owner may delete or edit a wish that somebody has already
-- reserved, and the buyer was never told. The row simply vanished from their
-- "Čo kupujem" page — and if they had already bought the thing, the app never
-- mentioned it again.
--
-- Why this cannot be solved on the owner's side: warning them ("this item is
-- reserved, are you sure?") would tell them the one thing this app exists to
-- hide. The owner's delete and edit must stay exactly as they are, down to the
-- wording of the dialog. So the message goes to the buyer instead, through a
-- table the owner's session never reads.
--
-- Why triggers rather than the Server Actions: the pre-edit values only exist in
-- OLD, the write is then atomic with the delete/update it describes, and no
-- future code path can forget to do it. `wishes` itself is untouched, so every
-- existing query — and every wish count on the family grid — keeps working and
-- keeps being correct.

begin;

create table if not exists claim_notices (
  id              uuid primary key default gen_random_uuid(),

  -- Addressed to a person, not attached to a wish: in the 'deleted' case the
  -- wish is gone by the time anybody reads this.
  claimer_id      uuid not null references family_members (id) on delete cascade,
  kind            text not null check (kind in ('deleted', 'edited')),

  -- Copied, not joined, for the same reason.
  owner_name      text not null,

  -- Deliberately NOT a foreign key. ON DELETE CASCADE would remove the notice
  -- at the exact moment it becomes worth having; SET NULL would lose the only
  -- handle used to coalesce repeat edits below.
  wish_id         uuid,

  old_title       text not null,
  old_description text,
  old_url         text,

  -- Null throughout for 'deleted': there is no "and now it says".
  new_title       text,
  new_description text,
  new_url         text,

  created_at      timestamptz not null default now(),

  constraint edited_has_new_title
    check (kind = 'deleted' or new_title is not null)
);

-- Composite: serves the equality every read uses, in the order the buyer's
-- screen wants them, so the ordered read needs no sort step.
create index if not exists claim_notices_claimer_id_idx
  on claim_notices (claimer_id, created_at desc);

-- At most one 'edited' notice per wish per buyer. Five edits in a row therefore
-- read as one "bolo X → teraz Y" against the title they originally reserved,
-- not as five separate alarms.
create unique index if not exists claim_notices_edited_key
  on claim_notices (wish_id, claimer_id) where kind = 'edited';

/**
 * The wish was deleted out from under whoever reserved it.
 *
 * Only reached for a reserved wish; see the trigger's WHEN clause below.
 */
create or replace function notice_wish_deleted()
returns trigger
language plpgsql
as $$
begin
  -- Any "this changed" notice is moot now; the whole item is gone.
  delete from claim_notices
   where wish_id = old.id
     and claimer_id = old.claimed_by
     and kind = 'edited';

  -- Selecting the owner's name rather than passing it in also decides the
  -- member-deletion case: removing a member cascades their wishes away, and by
  -- then their row is gone, so this SELECT finds nothing and inserts nothing.
  -- Announcing gifts for somebody who is no longer in the family would be
  -- noise.
  insert into claim_notices (
    claimer_id, kind, owner_name, wish_id,
    old_title, old_description, old_url
  )
  select
    old.claimed_by, 'deleted', m.name, old.id,
    old.title, old.description, old.url
  from family_members m
  where m.id = old.member_id;

  return old;
end;
$$;

-- The WHEN clause is checked by the executor without entering plpgsql at all,
-- so deleting an unreserved wish — the common case — costs nothing.
drop trigger if exists wishes_notice_deleted on wishes;
create trigger wishes_notice_deleted
  after delete on wishes
  for each row
  when (old.claimed_by is not null)
  execute function notice_wish_deleted();

/**
 * The wish was rewritten under whoever reserved it — or they let it go.
 *
 * Only reached when somebody already held the claim before this statement; see
 * the trigger's WHEN clause below. That is deliberately `old`, not `new`:
 * somebody claiming a wish is agreeing to it as it stands, so a statement that
 * claims and rewrites at once has nobody to notify.
 */
create or replace function notice_wish_edited()
returns trigger
language plpgsql
as $$
begin
  -- Releasing a claim takes that person's notices with it: they are not buying
  -- this any more, so nothing about it concerns them.
  if new.claimed_by is distinct from old.claimed_by then
    delete from claim_notices
     where wish_id = old.id
       and claimer_id = old.claimed_by
       and kind = 'edited';
    return new;
  end if;

  -- Past here the same person still holds the claim, so new.claimed_by is the
  -- buyer and is not null.
  if new.title is not distinct from old.title
     and new.description is not distinct from old.description
     and new.url is not distinct from old.url then
    return new;
  end if;

  -- ON CONFLICT keeps the original old_* — what they actually reserved — and
  -- moves only the "teraz" half forward.
  insert into claim_notices (
    claimer_id, kind, owner_name, wish_id,
    old_title, old_description, old_url,
    new_title, new_description, new_url
  )
  select
    new.claimed_by, 'edited', m.name, new.id,
    old.title, old.description, old.url,
    new.title, new.description, new.url
  from family_members m
  where m.id = new.member_id
  on conflict (wish_id, claimer_id) where kind = 'edited'
  do update set
    new_title       = excluded.new_title,
    new_description = excluded.new_description,
    new_url         = excluded.new_url,
    created_at      = now();

  -- Edited back to exactly where it started. Nothing happened as far as the
  -- buyer is concerned, so leave nothing behind.
  delete from claim_notices
   where wish_id = new.id
     and claimer_id = new.claimed_by
     and kind = 'edited'
     and old_title is not distinct from new_title
     and old_description is not distinct from new_description
     and old_url is not distinct from new_url;

  return new;
end;
$$;

drop trigger if exists wishes_notice_edited on wishes;
create trigger wishes_notice_edited
  after update on wishes
  for each row
  when (old.claimed_by is not null)
  execute function notice_wish_edited();

-- Deliberately no policies, exactly as everywhere else. See 0001_init.sql.
alter table claim_notices enable row level security;

commit;
