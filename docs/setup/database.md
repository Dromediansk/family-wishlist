# Database

Six tables, no policies, and a migration process that stays deliberately manual
in production.

## Schema

Four tables answer *who is this and who may see them*; two hold the wishes.

### `app_users`

One row per Google account. This is identity, and nothing here is per group.

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `auth_user_id` | uuid, unique → `auth.users(id)` `ON DELETE CASCADE`. Nullable: a row without one can never sign in, which is what the dev seed's fake relatives are |
| `email` | from the Google profile |
| `name` | 1–50 chars. The seed label a new membership starts from, and the snapshot `fulfil_wish` writes into history |
| `created_at` | |

### `groups`

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `name` | 1–60 chars |
| `created_by` | → `app_users(id)` `ON DELETE SET NULL`, indexed |
| `created_at` | |

`created_by` exists for one reason: the per-account
[creation cap](../content/groups.md#the-creation-cap) has to be countable. It is
nulled rather than cascaded, so deleting an account never takes a group other
people are still using.

Deleting the *group* is a thing the app does —
[Deleting a group](../content/groups.md#deleting-a-group) — and it needs no code
beyond the one `delete`: the two `ON DELETE CASCADE`s below take the memberships
and the invites, and `memberships_release_claims` fires on each cascaded
membership. No wish, no photo and no history row is reachable from here.

### `memberships`

One row per (account, group). This is where belonging lives — and with it the
name and the role, both of which are per group.

| Column | Notes |
|---|---|
| `id` | uuid, primary key. What an admin control addresses |
| `group_id` | → `groups(id)` `ON DELETE CASCADE`, indexed |
| `user_id` | → `app_users(id)` `ON DELETE CASCADE`, indexed |
| `name` | 1–50 chars. **Not unique** — a label on a card, not an identity |
| `role` | `admin` \| `member`, default `member` |
| `created_at` | join order, which the switcher and `preferredName` both read |

Two unique constraints, and the second is not redundant with the primary key:

- `(group_id, user_id)` — one membership per person per group.
- `(id, group_id)` — the target a *composite* foreign key needs in order to
  prove "this membership is in that group". Postgres will only point a composite
  key at a unique constraint covering both columns, and `invites` needs exactly
  that.

### `invites`

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `group_id` | → `groups(id)` `ON DELETE CASCADE`, indexed |
| `token` | unique, and stored in **plaintext** so a link already sent can be copied again |
| `created_by` | a `memberships.id` — never an `app_users.id`. See the constraint below |
| `expires_at` | nullable; the app sets 24 hours |
| `max_uses` | nullable, `> 0` when set. **Nothing in the app sets it**, so every invite is unlimited-use — [before changing that](../content/groups.md#before-exposing-a-use-limit) |
| `uses` | how many joins it has admitted, default 0 |
| `revoked_at` | nullable |
| `created_at` | newest first is how both invite lists read |

`invites_creator_in_group` is a foreign key on `(created_by, group_id)` →
`memberships (id, group_id)`, `ON DELETE CASCADE`. An invite therefore cannot
exist unless its creator is a member of the group it admits people to —
unstorable in Postgres, not merely checked in TypeScript. It is also why
`created_by` here and `created_by` on `groups` live in different id spaces
despite the shared name.

### `wishes`

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `owner_user_id` | → `app_users(id)` `ON DELETE CASCADE`, indexed |
| `title` | 1–120 chars |
| `description` | ≤ 1000 chars, nullable |
| `url` | must match `^https?://`, nullable |
| `photo_path` | Storage object key, nullable. Shape enforced by CHECK; the bytes live in the `wish-photos` bucket |
| `claimed_by_user_id` | → `app_users(id)` `ON DELETE SET NULL`, indexed |
| `claimed_at` | paired with `claimed_by_user_id` |
| `created_at` | lists are ordered oldest first |

Both id columns point at an **account**, not a membership: a list belongs to a
person, and so does a claim.

Two constraints carry product rules into the database:

- `no_self_claim` — `claimed_by_user_id` may never equal `owner_user_id`.
- `claim_consistent` — `claimed_by_user_id` and `claimed_at` are both set or
  both null.

And one trigger keeps them compatible. `ON DELETE SET NULL` nulls
`claimed_by_user_id` but not `claimed_at`, which alone would trip
`claim_consistent` and make deleting an account fail. `clear_claim_timestamp` is
a `BEFORE UPDATE` trigger — it runs ahead of constraint checks — and clears the
timestamp. Its body is plpgsql, so it names the column in stored text that no
rename reaches; the two `CHECK` expressions above are re-written by Postgres and
need nothing.

### `fulfilled_wishes`

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `owner_id` | → `app_users(id)` `ON DELETE SET NULL`, indexed with `fulfilled_at` |
| `owner_name` | copied, not joined — see below |
| `giver_id` | → `app_users(id)` `ON DELETE SET NULL`, indexed with `fulfilled_at` |
| `giver_name` | copied, not joined — see below |
| `title`, `description`, `url` | a snapshot of the wish at the moment it is handed over — see below |
| `fulfilled_at` | defaults to `now()` |

Names are copied rather than joined, and copied from `app_users` rather than
from a membership, so a record survives everything around it: deleting an
account takes neither its own history nor the other party's, and a record of a
real gift does not depend on a group either party may since have left.
`no_self_gift` mirrors `no_self_claim` on `wishes`.

`title`, `description` and `url` are copied for the same reason and one more.
They are a **snapshot**, not a duplicate: what the gift was called when it
changed hands, which stops being the same fact as the wish's title the moment
the wish is deleted — and `fulfil_wish` deletes it in that very statement.
Referencing the wish instead would mean keeping the row, and then an owner
editing their old wish would rewrite the giver's history, while an account
deletion would cascade the title away. The three columns are the price of
history that nobody can edit and that outlives its people.

What this table is for and the two pages that read it:
[History](../content/history.md).

## Functions and triggers

Six, plus `clear_claim_timestamp` above. Every one of them is in the database
rather than in application code because it has to be unavoidable.

| Name | Kind | Does |
|---|---|---|
| `handle_new_auth_user` | trigger on `auth.users` | Writes one `app_users` row per new auth user and decides nothing else — [Identity](../content/membership.md#one-row-per-google-account) |
| `shares_group` | `stable` sql | Do these two accounts share at least one group? |
| `peer_user_ids` | `stable` sql, `setof uuid` | Every account a viewer may see. Self-membership comes from the join, so it returns **nothing** for an account in no group — `seedPeers` adds the viewer's own id whatever the query said |
| `check_claim_peer` | `before insert or update` on `wishes` (`wishes_check_claim_peer`) | Refuses a claim between two people who share no group. The write-side backstop the read side cannot have |
| `release_orphaned_claims` | `after delete` on `memberships` (`memberships_release_claims`) | Releases the claims a departure orphans, in both directions — [Removing somebody](../content/groups.md#removing-somebody) |
| `fulfil_wish` | sql | Deletes a claimed wish and writes its history row in one statement — [History](../content/history.md) |

A trigger is not a policy, so the two on `wishes` and `memberships` leave the
zero-policy wall exactly where it was.

`release_orphaned_claims` nulls `claimed_by_user_id` and lets
`clear_claim_timestamp` null the timestamp, which is the same path
`ON DELETE SET NULL` already relies on.

## Row level security

Enabled on every table, with **zero policies**, on purpose. Never add one — see
[The privacy rule](../content/privacy-rule.md#why-it-cannot-be-a-database-policy).

`auto_expose_new_tables = true` in `supabase/config.toml` has to stay. Every read
and write goes through PostgREST as `service_role` and no migration grants
table access; the hosted project predates the always-revoked default. Without
it the tables exist locally and answer "permission denied".

**That field is removed on 2026-10-30**, at which point the migrations need
explicit table `GRANT`s as well — in production too.

Functions are the exception, and the only place a migration issues a `GRANT`.
Postgres grants `EXECUTE` on a new function to `PUBLIC` by default, which would
let the anon key call it straight past the zero-policy wall — a function is not a
table, so `auto_expose_new_tables` does nothing for it either way. So
`fulfil_wish`, `shares_group` and `peer_user_ids` are each revoked from
`public, anon, authenticated` and granted back to `service_role` alone, because
`PUBLIC` includes `service_role` and the revoke would otherwise take that with
it. Add a function and you owe it the same pair.

## Migrations

| File | Does | Destructive? |
|---|---|---|
| `0001_init.sql` | The two tables, constraints, indexes, the timestamp trigger, RLS on | no |
| `0002_realtime.sql` | **Nothing.** Comments only — a warning against `postgres_changes`, kept next to the schema | **do not run it in production** |
| `0003_auth.sql` | Google sign-in: `auth_user_id`, `email`, `status`, the provisioning trigger | **`truncate family_members cascade`** |
| `0004_claim_notices.sql` | The buyer-notice table and its two triggers | no |
| `0005_drop_claim_notices.sql` | Drops all three again | touches no wish and no member |
| `0006_wish_photo.sql` | Adds the nullable `photo_path` column | no |
| `0007_fulfilled_wishes.sql` | The `fulfilled_wishes` table and the `fulfil_wish` function | no |
| `0008_multi_tenant.sql` | Many groups, one account: the four identity tables, the peer functions and triggers, the renamed wish columns | **reshapes every table — take a snapshot first** |

`0003_auth.sql` deletes every member and every wish. Identity moved from "a name
you picked" to "a Google account", and there is no way to tell which account an
old row belonged to — guessing by name would hand someone else's list to whoever
signed up with a matching name. On a fresh project there is nothing to lose; on a
running one, take a snapshot first.

`0005` is a forward migration rather than an edit to `0004`, because production
already had `0004` pasted in by hand. On a fresh database you still need both, in
order. Why the notices went away at all:
[The privacy rule](../content/privacy-rule.md#this-is-a-known-accepted-hole).

`0008` is written to be non-destructive — every member becomes an identity, every
active one becomes a membership in a single group, and no wish is touched, since
`app_users.id` inherits the old id and every reference to it stays valid. It
still rewrites foreign keys and drops a table at the end, and there is no way
back from that without a snapshot. **Take one.**

### Applying them

**In production: by hand**, pasted into the Supabase SQL editor, in order,
skipping `0002`.

**Locally**: `npm run db:reset` applies all eight. It runs `0002` too, which is
harmless — that file is entirely comments with no DDL. The CLI accepts the
`0001_`-style names; they need no timestamp prefix.

## The `wish-photos` bucket

`0006` adds the column that points at a photo; it does not create the place the
photo goes. That is a Storage bucket, private, 2 MiB, and limited to
`image/webp`, `image/jpeg` and `image/png`.

**Locally** it is declared in `supabase/config.toml` and created by
`npm run db:reset` — *not* by `supabase start`, which leaves an existing project
alone. A stack that was running with `[storage] enabled = false` needs
`npm run db:stop` before `npm run db:start`, or the storage containers never come
up.

**In production**: by hand in the dashboard, before pasting `0006`. See
[Production setup](production.md).

Like every table, the bucket has RLS on and **no policy**. Creating a bucket is
not creating a policy; the `service_role` client is what reads and writes it, and
[the route that serves a photo](../content/wishes.md#getting-one-out) is the only
way anyone sees one.

## Never run these

```
supabase link
supabase db push
supabase db pull
supabase db reset --linked
```

Production has no `supabase_migrations.schema_migrations` table, because its
migrations were always pasted in by hand. The CLI would therefore read it as a
database with nothing applied and replay everything — `0003_auth.sql`'s
`truncate` included.

The CLI exists in this repo for the local stack and nothing else. Two things back
that up rather than relying on memory: `supabase/.temp/` is gitignored, so no
link becomes sticky, and `scripts/seed-dev.mjs` refuses to run against anything
but loopback.

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
