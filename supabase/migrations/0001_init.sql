-- Family Wish List — initial schema
--
-- Run this once in the Supabase SQL editor (see README.md).
--
-- Security model: this app has no login. Identity is a name the visitor picks,
-- stored in a cookie, so Postgres has no per-user identity to key policies off.
-- The "hide claims from the list owner" rule therefore CANNOT be expressed as an
-- RLS policy. Instead:
--
--   * RLS is enabled on every table with ZERO policies, so the anon and
--     authenticated roles can read and write nothing. The anon key is inert.
--   * All access happens server-side in Next.js using the service_role key,
--     which bypasses RLS, and the server strips claim columns before sending
--     the owner's own list to their browser.
--
-- Never expose the service_role key to the browser.

create extension if not exists pgcrypto;

create table if not exists family_members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique check (char_length(btrim(name)) between 1 and 50),
  role       text not null default 'member' check (role in ('admin', 'member')),
  created_at timestamptz not null default now()
);

create table if not exists wishes (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references family_members (id) on delete cascade,
  title       text not null check (char_length(btrim(title)) between 1 and 120),
  description text check (char_length(description) <= 1000),
  url         text check (url is null or url ~* '^https?://'),
  claimed_by  uuid references family_members (id) on delete set null,
  claimed_at  timestamptz,
  created_at  timestamptz not null default now(),

  -- You may never claim an item off your own list.
  constraint no_self_claim check (claimed_by is null or claimed_by <> member_id),

  -- claimed_by and claimed_at are set and cleared together.
  constraint claim_consistent check ((claimed_by is null) = (claimed_at is null))
);

create index if not exists wishes_member_id_idx  on wishes (member_id);
create index if not exists wishes_claimed_by_idx on wishes (claimed_by);

-- Removing a family member releases anything they had claimed, via the
-- ON DELETE SET NULL above. That nulls claimed_by but not claimed_at, which on
-- its own would trip the claim_consistent constraint and make the delete fail.
-- A BEFORE UPDATE trigger runs ahead of constraint checks, so clearing the
-- timestamp here keeps the delete working and the invariant true.
create or replace function clear_claim_timestamp()
returns trigger
language plpgsql
as $$
begin
  if new.claimed_by is null then
    new.claimed_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists wishes_clear_claim_timestamp on wishes;
create trigger wishes_clear_claim_timestamp
  before update on wishes
  for each row
  execute function clear_claim_timestamp();

-- Deliberately no policies. See the note at the top of this file.
alter table family_members enable row level security;
alter table wishes         enable row level security;
