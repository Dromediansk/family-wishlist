# Family Wish List

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Radix · Supabase.
UI language is **Slovak**. `README.md` explains the *why* behind everything below.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (`src/**/*.test.ts`, node env) |
| `npm run db:start` / `db:stop` / `db:status` | Local Supabase stack in Docker |
| `npm run db:reset` | Rebuild the local DB from `supabase/migrations/` |
| `npm run db:seed` | Fake family — run it *after* signing in, see below |

Run `npm run typecheck && npm run lint && npm test` before claiming work is done.

`npm run dev` talks to the local Docker stack, not the hosted project:
`.env.development.local` outranks `.env.local` and is only loaded when `NODE_ENV`
is development, so `npm run build && npm start` still reaches production.
README's "A local database" section is the setup. Nothing works until
`npm run db:start` is running.

## The one rule

**A list owner must never learn that one of their own wishes has been claimed.**
Everyone else sees claims; the owner does not. Every design oddity here follows
from that. Enforced in eight places — change one and you must check the rest:

1. `getWishListFor` (`src/lib/queries.ts`) selects `OWNER_WISH_COLUMNS` on the
   owner path, so claim columns never leave the database.
2. `OwnerWish` (`src/lib/types.ts`) has no claim fields, making a leak a type error.
3. `toOwnerWish` builds an explicit object instead of spreading the row.
4. `src/lib/wishes.test.ts` pins it down.

The family grid shows "free / total" per member, and the same rule applies to
that arithmetic — "3 / 5" on your own card would say two of yours are taken:

5. `getMemberSummaries` (`src/lib/queries.ts`) counts the free ones with
   `.is("claimed_by", null)` **and** `.neq("member_id", viewerId)`, so no claim
   column is selected and the viewer's own rows never reach the count.
6. `MemberSummary` (`src/lib/types.ts`) is discriminated on `viewerIsOwner`, so
   the owner half of the union has no `availableCount` field to render.
7. `toMemberSummary` (`src/lib/members.ts`) returns that half for the viewer.
8. `src/lib/members.test.ts` pins it down.

`MemberCard` therefore shows a bare total for your own list — and also for any
empty list, where "0 / 0" would just be noise.

### The one channel that runs the other way

Everything above hides claims from the owner. `claim_notices` exists to tell the
**buyer** something: when an owner deletes or rewrites a wish that was already
reserved, a trigger writes a row addressed to whoever reserved it, and `/buying`
shows "bolo … → teraz …" or "odstránil zo svojho zoznamu" with a Rozumiem
button. It does not weaken the rule, and the reasons are the design:

- The owner's delete and edit are identical whether or not the wish was claimed
  — same dialog wording, same `{ ok: true }`. A "this is reserved, are you sure?"
  prompt *would be* the leak. That is why the notice is written by a trigger in
  `0004_claim_notices.sql` rather than by branching inside the Server Action:
  `OLD` only exists in a trigger, and no future code path can forget it.
- `wishes` is untouched — deletes stay hard deletes — so every count on the
  family grid stays correct with no new filter to forget. A total that *failed*
  to drop after a delete would say "that one was claimed" as loudly as a badge.
- Only `getNoticesFor` and `countNoticesFor` read the table, only ever for the
  member the row is addressed to.

`toBuyingItems` (`src/lib/notices.ts`) is pure and pinned by
`src/lib/notices.test.ts`, including that a cancelled row carries no claim field.

Never do these:

- Read `claim_notices` from any code path that serves a list's owner. It is
  addressed to the buyer; there is no owner-shaped view of it and there must not
  be one.
- Add an RLS policy to any table. RLS is on with **zero policies** on purpose.
- Enable `postgres_changes` — it is RLS-filtered and would push `claimed_by` to owners.
- Put anything in `LIVE_PAYLOAD` (`src/lib/live.ts`). The ping is empty by design.
- Skip the ping for the owner's tab. Every tab refreshes on every change; a tab
  that *didn't* refresh would itself be the tell.

## Two Supabase clients — never mix them

- `src/lib/supabase-auth.ts` → visitor's session. Answers *who is this*. Reads
  no table. Calling `.from()` on it returns empty, which reads as "no rows"
  rather than "no access" — always a bug.
- `src/lib/supabase.ts` → `service_role`, bypasses RLS, does all data work.
  `import "server-only"` keeps it out of client bundles.

## Server Actions

Reachable by direct POST, so each one must, in order:

1. `const current = await getCurrentMember()` — re-derive the caller; never trust
   a client-supplied id. Returns only **approved** members, so `pending` users
   are refused without any action knowing that state exists.
2. Admin-only work: `await requireAdmin()`. An admin-only **page** re-checks with
   `isAdmin()` (`src/lib/access.ts`) in its own body and redirects — `/family` is
   the first. A menu item you hid is not a guard; the URL is guessable.
3. Validate input with Zod. **Error messages are Slovak.**
4. Put ownership in the `WHERE` clause (`.eq("member_id", current.id)`) and check
   `data.length === 0` rather than pre-checking with a separate read.
5. `revalidatePath("/", "layout")` then `await notifyChanged()`.

Return `ActionResult`, never throw for expected failures.

## Gotchas

- **`src/proxy.ts`, not `middleware.ts`.** Next 16 renamed the convention;
  Supabase's guides still say middleware and such a file would never run.
- **Migrations reach production by hand**, pasted into the Supabase SQL editor.
  `0002_realtime.sql` is a comment file — **do not run it there**.
  `0003_auth.sql` truncates all data. `0004_claim_notices.sql` adds the
  buyer-notice table and its triggers; it deletes nothing and alters no existing
  table.

  Locally they are applied by `npm run db:reset`, which runs all four in order.
  It runs `0002` too — harmless, since that file is comments with no DDL. The
  CLI accepts the `0001_`-style names; they need no timestamp prefix.

- **Never run `supabase link`, `supabase db push`, `supabase db pull`, or
  `supabase db reset --linked`.** Production has no
  `supabase_migrations.schema_migrations` table, so the CLI would read it as a
  database with nothing applied and replay everything — `0003_auth.sql`'s
  `truncate family_members cascade` included. The CLI exists in this repo for
  the local stack only.

- **The CLI is not a dependency.** `npm run supabase` is `npx --yes
  supabase@<pinned>`, and every `db:*` script goes through it. Do not
  `npm i -D supabase`: its binary is ~110 MB, the Linux packages declare no
  `libc` so a build host installs both the glibc and musl copies, and Vercel
  installs devDependencies. Bump the version in that one script, not in five.

- **`auto_expose_new_tables = true`** in `supabase/config.toml`, and it has to
  be. Every read and write goes through PostgREST as `service_role` and no
  migration issues a GRANT; the hosted project predates the always-revoked
  default. Without it the tables exist locally and answer "permission denied".
  The field is removed on 2026-10-30 — at which point the migrations need
  explicit GRANTs, in production too.

- **A local seed cannot insert `family_members`.** `handle_new_auth_user()`
  picks the admin with `not exists (select 1 from family_members)`, so a seeded
  member makes that false and strands your real sign-in as `pending`. Hence
  `supabase/seed.sql` is empty of members and `scripts/seed-dev.mjs` runs after
  the first sign-in, anchoring on the row it created. That script writes with
  the service_role key, so it refuses any non-loopback URL.
- **All user-facing strings are Slovak**, including validation messages.
  `wishCount()` in `src/lib/utils.ts` handles 1 / 2–4 / 5+ plural forms.
- **`export const dynamic = "force-dynamic"`** in the root layout. Nothing may be
  prerendered or cached between visitors.
- **No service worker**, deliberately — cached HTML could show an owner their own
  claims. `experimental.useOffline` in `next.config.ts` covers offline instead.
- Tests cover **pure functions only** (`access`, `live`, `wishes`, `members`,
  `manifest`, `utils`) —
  no mocks, no DB. Keep new logic pure enough to test that way.
- `AGENTS.md` is written by `next dev`, not by you. It reappears after every dev
  run; commit it with your work rather than fighting it.
- Path alias `@/*` → `./src/*`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
