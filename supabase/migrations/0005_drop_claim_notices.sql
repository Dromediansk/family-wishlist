-- Family Wish List — removing the buyer notices
--
-- Run this once in the Supabase SQL editor, after 0004_claim_notices.sql.
-- It touches no wish and no member: the only table it drops is claim_notices.
--
-- 0004 told the buyer after the fact, because an owner could still delete or
-- rewrite a reserved wish. They are now refused outright, so both triggers have
-- nothing left to report. Removing a member was never a third case: the
-- trigger's lookup in family_members finds no row by then.
-- docs/content/privacy-rule.md#this-is-a-known-accepted-hole
--
-- Dropping the triggers before the table is not required — `drop table` takes
-- them with it — but it is spelled out so the order reads as deliberate.

begin;

drop trigger if exists wishes_notice_edited on wishes;
drop trigger if exists wishes_notice_deleted on wishes;

drop function if exists notice_wish_edited();
drop function if exists notice_wish_deleted();

drop table if exists claim_notices;

commit;
