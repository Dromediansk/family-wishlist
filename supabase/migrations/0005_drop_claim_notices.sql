-- Family Wish List — removing the buyer notices
--
-- Run this once in the Supabase SQL editor, after 0004_claim_notices.sql.
-- It touches no wish and no member: the only table it drops is claim_notices.
--
-- 0004 existed because an owner could delete or rewrite a wish somebody had
-- already reserved, and warning the owner would have told them the one thing
-- this app hides. The buyer was told afterwards instead.
--
-- The owner is now refused outright — `claimed_by is null` sits in the WHERE
-- clause of both updateWish and deleteWish (src/app/actions/wishes.ts), and
-- they are shown "Toto želanie už má niekto rezervované…" without ever being
-- told by whom. So a reserved wish can no longer be changed or removed, and
-- there is nothing left for either trigger to report:
--
--   * wishes_notice_edited fired on an owner's edit. Refused.
--   * wishes_notice_deleted fired on an owner's delete. Refused.
--
-- Removing a member was never a third case. Their wishes cascade away, but the
-- trigger's `select ... from family_members where m.id = old.member_id` finds
-- no row by then and inserts nothing (0004_claim_notices.sql, lines 84-96).
--
-- Dropping the triggers before the table is not required — `drop table` would
-- take them with it — but it is spelled out so the order reads as deliberate.

begin;

drop trigger if exists wishes_notice_edited on wishes;
drop trigger if exists wishes_notice_deleted on wishes;

drop function if exists notice_wish_edited();
drop function if exists notice_wish_deleted();

drop table if exists claim_notices;

commit;
