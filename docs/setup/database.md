# Database

Eight tables, no policies, and a migration process that stays deliberately
manual in production.

**`supabase/migrations/` is the schema.** This file covers only what the DDL
cannot say for itself. For what the tables *mean*, see
[Entities](../project-context.md#entities).

## What the schema is doing that the DDL cannot explain

### Ids point at accounts, not memberships

`wishes.owner_user_id` and `wishes.claimed_by_user_id` both reference
`app_users`: a list belongs to a person, and so does a claim.

`groups.created_by` is an `app_users.id`; `invites.created_by` is a
`memberships.id`. Two id spaces, one column name — the branded types are what
keep them apart in TypeScript.

`groups.created_by` is `ON DELETE SET NULL` rather than cascaded, so deleting an
account never takes a group other people are still using. It exists so the
per-account [creation cap](../decisions/groups-and-invites.md#the-creation-cap)
is countable.

### `memberships` has two unique constraints, and the second is not redundant

- `(group_id, user_id)` — one membership per person per group.
- `(id, group_id)` — the target a *composite* foreign key needs. Postgres will
  only point one at a unique constraint covering both columns, and
  `invites_creator_in_group` needs exactly that: an invite cannot exist unless
  its creator is a member of the group it admits people to. Unstorable in
  Postgres, not merely checked in TypeScript.

### Constraints carry product rules

| Constraint | On | Says |
|---|---|---|
| `no_self_claim` | `wishes` | `claimed_by_user_id` may never equal `owner_user_id` |
| `claim_consistent` | `wishes` | `claimed_by_user_id` and `claimed_at` are both set or both null |
| `no_self_gift` | `fulfilled_wishes` | mirrors `no_self_claim` |
| `check_wish_group_owner` | `wish_groups` | refuses a tag naming a group the wish's owner does not belong to |

`clear_claim_timestamp` exists to keep two of those compatible. `ON DELETE SET
NULL` nulls `claimed_by_user_id` but not `claimed_at`, which alone would trip
`claim_consistent` and make deleting an account fail. It is a `BEFORE UPDATE`
trigger, so it runs ahead of constraint checks. Its body is plpgsql, so it names
the column in stored text that no rename reaches.

### `fulfilled_wishes` copies instead of joining

Both names, the wish's `title`/`description`/`url` and `group_names` are all
**copied**, so a record survives everything around it: deleting an account takes
neither party's history, and a record of a real gift does not depend on a group
either party may since have left.

The text is a **snapshot**, not a duplicate — what the gift was called when it
changed hands. Referencing the wish would mean keeping the row, and then an
owner editing their old wish would rewrite the giver's history.

`group_names` holds only the tags naming a group **both** parties belonged to at
handover. An empty array is legal and means exactly one thing: a gift handed
over before `0010`.

[Wishes, claims and history](../decisions/wishes-claims-history.md)

## Functions and triggers

Nine, plus `clear_claim_timestamp`. Each is in the database rather than in
application code because it has to be **unavoidable**.

| Name | Kind | Does |
|---|---|---|
| `handle_new_auth_user` | trigger on `auth.users` | Writes one `app_users` row per new auth user and decides nothing else |
| `check_wish_group_owner` | `before insert` on `wish_groups` | Refuses a group tag the wish's owner does not belong to |
| `shared_wish_groups` | `stable` sql, `setof uuid` | *Which* groups a wish reaches that both of two people stand in |
| `wish_shares_group` | `stable` sql | The same question as a yes/no — `exists` over `shared_wish_groups`, so the insert guard and the release sweep cannot drift apart |
| `peer_user_ids` | `stable` sql, `setof uuid` | Every account a viewer may see. Returns **nothing** for an account in no group, so the caller seeds the viewer's own id |
| `check_claim_peer` | `before insert or update` on `wishes` | Refuses a claim unless claimer **and** owner both belong to a group *this wish* is tagged with |
| `release_orphaned_claims` | `after delete` on `memberships` | Releases a claim once claimer and owner no longer both belong to a group the wish is tagged with |
| `update_wish` | plpgsql | Rewrites a wish's text and its group tags in one guarded statement |
| `fulfil_wish` | sql | Deletes a claimed wish and writes its history row in one statement |

A trigger is not a policy, so the three on `wishes`, `memberships` and
`wish_groups` leave the zero-policy wall exactly where it was.

`release_orphaned_claims` nulls `claimed_by_user_id` and lets
`clear_claim_timestamp` null the timestamp — the same path `ON DELETE SET NULL`
already relies on.

## Row level security

Enabled on every table, with **zero policies**, on purpose. Never add one —
[why](../decisions/privacy-rule.md#why-it-cannot-be-a-database-policy).

`auto_expose_new_tables = true` in `supabase/config.toml` has to stay. Every
read and write goes through PostgREST as `service_role` and no migration grants
table access; the hosted project predates the always-revoked default. Without
it the tables exist locally and answer "permission denied".

**That field is removed on 2026-10-30**, at which point the migrations need
explicit table `GRANT`s as well — in production too.

**Functions are the exception, and the only place a migration issues a `GRANT`.**
Postgres grants `EXECUTE` on a new function to `PUBLIC` by default, which would
let the anon key call it straight past the zero-policy wall — a function is not
a table, so `auto_expose_new_tables` does nothing for it either way. So
`fulfil_wish`, `update_wish`, `wish_shares_group`, `shared_wish_groups` and
`peer_user_ids` are each revoked from `public, anon, authenticated` and granted
back to `service_role` alone, because `PUBLIC` includes `service_role` and the
revoke would otherwise take that with it. **Add a function and you owe it the
same pair.**

## Migrations

| File | Does | Destructive? |
|---|---|---|
| `0001_init.sql` | The two original tables, constraints, indexes, the timestamp trigger, RLS on | no |
| `0002_realtime.sql` | **Nothing.** Comments only — a warning against `postgres_changes`, kept next to the schema | **do not run it in production** |
| `0003_auth.sql` | Google sign-in: `auth_user_id`, `email`, `status`, the provisioning trigger | **`truncate family_members cascade`** |
| `0004_claim_notices.sql` | The buyer-notice table and its two triggers | no |
| `0005_drop_claim_notices.sql` | Drops all three again | touches no wish and no member |
| `0006_wish_photo.sql` | Adds the nullable `photo_path` column | no |
| `0007_fulfilled_wishes.sql` | The `fulfilled_wishes` table and the `fulfil_wish` function | no |
| `0008_multi_tenant.sql` | Many groups, one account: the four identity tables, the peer functions and triggers, the renamed wish columns | **reshapes every table — take a snapshot first** |
| `0009_wish_groups.sql` | Per-wish group visibility: `wish_groups`, its ownership guard, `wish_shares_group`, the two claim triggers sharpened onto it, and `update_wish` | no |
| `0010_fulfilled_wish_groups.sql` | `fulfilled_wishes.group_names`, `shared_wish_groups`, and `fulfil_wish` rewritten to snapshot the tags both parties shared | no |
| `0011_group_notes.sql` | `group_notes`: one private note per person per group, hung off `memberships` by a cascading composite foreign key | no |

**`0003_auth.sql` deletes every member and every wish.** Identity moved from "a
name you picked" to "a Google account", and there is no way to tell which
account an old row belonged to — guessing by name would hand someone else's list
to whoever signed up with a matching name.

`0005` is a forward migration rather than an edit to `0004`, because production
already had `0004` pasted in by hand. On a fresh database you still need both,
in order. Why the notices went away:
[This is a known, accepted hole](../decisions/privacy-rule.md#this-is-a-known-accepted-hole).

`0008` is written to be non-destructive, but it still rewrites foreign keys and
drops a table at the end, and there is no way back from that without a snapshot.
**Take one.**

### Applying them

**In production: by hand**, pasted into the Supabase SQL editor, in order,
skipping `0002`.

**Locally:** `npm run db:reset` applies all eleven. It runs `0002` too, which is
harmless — that file is entirely comments. The CLI accepts the `0001_`-style
names; they need no timestamp prefix.

## The `wish-photos` bucket

`0006` adds the column that points at a photo; it does not create the place the
photo goes. That is a Storage bucket: **private, 2 MiB**, limited to
`image/webp`, `image/jpeg` and `image/png`.

**Locally** it is declared in `supabase/config.toml` and created by
`npm run db:reset` — *not* by `supabase start`, which leaves an existing project
alone. A stack that was running with `[storage] enabled = false` needs
`npm run db:stop` before `npm run db:start`, or the storage containers never
come up.

**In production**: by hand in the dashboard, before pasting `0006` —
[Production setup](production.md).

Like every table, the bucket has RLS on and **no policy**. Creating a bucket is
not creating a policy; the `service_role` client is what reads and writes it.

## Never run these

```
supabase link
supabase db push
supabase db pull
supabase db reset --linked
```

Production has no `supabase_migrations.schema_migrations` table, because its
migrations were always pasted in by hand. The CLI would read it as a database
with nothing applied and replay everything — `0003_auth.sql`'s `truncate`
included.

Two things back that up rather than relying on memory: `supabase/.temp/` is
gitignored, so no link becomes sticky, and `scripts/seed-dev.mjs` refuses to run
against anything but loopback.

## The CLI is not a dependency

`npm run supabase` is `npx --yes supabase@<pinned>`, and every `db:*` script goes
through it. **Do not `npm i -D supabase`:**

- its binary is ~110 MB;
- the published Linux packages declare `os` and `cpu` but no `libc`, so a build
  host installs both the glibc and the musl copy — roughly 300 MB unpacked;
- Vercel installs devDependencies, because `next build` needs them, for a tool
  the build never runs.

The first `db:*` command of the day pays a few seconds to populate the npx cache
instead. Bump the version in that one script.
