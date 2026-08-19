# Database

Two tables, no policies, and a migration process that stays deliberately manual
in production.

## Schema

### `family_members`

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `auth_user_id` | uuid, unique → `auth.users(id)` `ON DELETE CASCADE`. The real identity |
| `email` | from the Google profile. Loaded only for the admin's approval dialog |
| `name` | 1–50 chars. **Not unique** — a label on a card, not an identity |
| `role` | `admin` \| `member` |
| `status` | `pending` \| `active`, indexed |
| `created_at` | also the sign-up order the admin screen sorts by |

### `wishes`

| Column | Notes |
|---|---|
| `id` | uuid, primary key |
| `member_id` | → `family_members(id)` `ON DELETE CASCADE`, indexed |
| `title` | 1–120 chars |
| `description` | ≤ 1000 chars, nullable |
| `url` | must match `^https?://`, nullable |
| `claimed_by` | → `family_members(id)` `ON DELETE SET NULL`, indexed |
| `claimed_at` | paired with `claimed_by` |
| `created_at` | lists are ordered oldest first |

Two constraints carry product rules into the database:

- `no_self_claim` — `claimed_by` may never equal `member_id`.
- `claim_consistent` — `claimed_by` and `claimed_at` are both set or both null.

And one trigger keeps them compatible. `ON DELETE SET NULL` nulls `claimed_by`
but not `claimed_at`, which alone would trip `claim_consistent` and make deleting
a member fail. `clear_claim_timestamp` is a `BEFORE UPDATE` trigger — it runs
ahead of constraint checks — and clears the timestamp.

`handle_new_auth_user` provisions one member row per auth user; what it does and
why it is a trigger is in
[Membership and roles](../content/membership.md#the-first-person-becomes-the-admin).

## Row level security

Enabled on every table, with **zero policies**, on purpose. Never add one — see
[The privacy rule](../content/privacy-rule.md#why-it-cannot-be-a-database-policy).

`auto_expose_new_tables = true` in `supabase/config.toml` has to stay. Every read
and write goes through PostgREST as `service_role` and no migration issues a
`GRANT`; the hosted project predates the always-revoked default. Without it the
tables exist locally and answer "permission denied".

**That field is removed on 2026-10-30**, at which point the migrations need
explicit `GRANT`s — in production too.

## Migrations

| File | Does | Destructive? |
|---|---|---|
| `0001_init.sql` | The two tables, constraints, indexes, the timestamp trigger, RLS on | no |
| `0002_realtime.sql` | **Nothing.** Comments only — a warning against `postgres_changes`, kept next to the schema | **do not run it in production** |
| `0003_auth.sql` | Google sign-in: `auth_user_id`, `email`, `status`, the provisioning trigger | **`truncate family_members cascade`** |
| `0004_claim_notices.sql` | The buyer-notice table and its two triggers | no |
| `0005_drop_claim_notices.sql` | Drops all three again | touches no wish and no member |

`0003_auth.sql` deletes every member and every wish. Identity moved from "a name
you picked" to "a Google account", and there is no way to tell which account an
old row belonged to — guessing by name would hand someone else's list to whoever
signed up with a matching name. On a fresh project there is nothing to lose; on a
running one, take a snapshot first.

`0005` is a forward migration rather than an edit to `0004`, because production
already had `0004` pasted in by hand. On a fresh database you still need both, in
order. Why the notices went away at all:
[The privacy rule](../content/privacy-rule.md#this-is-a-known-accepted-hole).

### Applying them

**In production: by hand**, pasted into the Supabase SQL editor, in order,
skipping `0002`.

**Locally**: `npm run db:reset` applies all five. It runs `0002` too, which is
harmless — that file is entirely comments with no DDL. The CLI accepts the
`0001_`-style names; they need no timestamp prefix.

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
