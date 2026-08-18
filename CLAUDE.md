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

`npm run dev` talks to the local Docker stack, not the hosted project. The
committed `.env.development` holds its address and the CLI's public demo keys —
identical on every machine, so there is nothing to copy. Production values live
in `.env.production.local`, **not** `.env.local`: Next resolves
`.env.development.local` → `.env.local` → `.env.development`, so a `.env.local`
would outrank the committed file and point `npm run dev` at production. Leave
that name unused. README's "A local database" is the setup, and nothing works
until `npm run db:start` is running.

## The one rule

**A list owner must never learn *who* claimed one of their own wishes, and must
never be shown claims while reading their list.** Everyone else sees claims; the
owner does not. Every design oddity here follows from that. Enforced in eight
places — change one and you must check the rest:

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

### The deliberate exception: a reserved wish is frozen

The rule above governs *reading*. Writing has one carve-out, and it is the only
place the app ever admits a claim to an owner.

**An owner cannot delete or edit a wish somebody has reserved.** The bin still
opens the same confirmation dialog and the pencil still opens the same form —
nothing on the list itself is disabled or badged — but on confirm the Server
Action refuses with "Toto želanie už má niekto rezervované, preto ho nemôžeš
vymazať." (or "…upraviť."). It never says by whom, and that part is not
negotiable.

This is a **known, accepted** hole in the surprise: an owner who clicks the bin
on every wish learns which of them are taken. It was chosen over the previous
design, where the owner's delete silently succeeded and the buyer was told
afterwards through `claim_notices`. Do not "fix" the inconsistency by hiding the
refusal, and do not extend it by showing claim state on the owner's list.

How it is enforced — four things, in this order:

1. `.is("claimed_by", null)` sits in the `WHERE` clause of `updateWish` and
   `deleteWish` (`src/app/actions/wishes.ts`), next to `.eq("member_id", …)`.
   That is the whole guard, and it is race-free for the same reason
   `claimWish`'s conditional update is: a claim landing first stops the row from
   matching. Never replace it with a read-then-write.
2. `refusalFor` in the same file reads `claimed_by` **only after** the write
   matched nothing, and only to pick the wording. This is the one owner-serving
   path allowed to select that column; the value never leaves the function, and
   it must never migrate into `OWNER_WISH_COLUMNS`, `getWishListFor` or
   `OwnerWish`.
3. `refusalFor` (`src/lib/wishes.ts`) is pure and holds both sentences.
4. `src/lib/wishes.test.ts` pins it down, including that no claimer id appears.

### A refusal ends the dialog it happens in

`ActionResult` carries an optional **`final`** alongside `error`: this call will
fail the same way however often it is repeated. Every refusal above sets it; a
Zod message or a dropped connection does not. Without that distinction the
shared `WishForm` could not tell "somebody reserved it" from "the title is too
long", and fixing a typo and resubmitting would stop working.

Both dialogs then swap the way forward for the way out, because a button that
visibly does nothing reads as a bug:

- `DeleteWishButton` becomes "Nedá sa vymazať" with the reason as its
  description and a single **Zavrieť**. It is a controlled `AlertDialog` purely
  so the failure clears on close — reopening asks again, and by then the wish
  may have been released.
- `WishForm` replaces its submit button with **Zavrieť** (`onDone`). Its state
  resets by itself: Radix unmounts dialog content when closed.

A non-final failure keeps the old behaviour — the question stands, the error
sits above the buttons, and the button can be pressed again.

Because a reserved wish can no longer change or vanish, there is nothing left to
tell the buyer after the fact. `claim_notices`, its two triggers and the whole
`/buying` notice UI were removed in `0005_drop_claim_notices.sql`. Removing a
member was never a third producer — the delete trigger's `select … from
family_members` found no row by then and inserted nothing.

Never do these:

- Add an RLS policy to any table. RLS is on with **zero policies** on purpose.
- Enable `postgres_changes` — it is RLS-filtered and would push `claimed_by` to owners.
- Put anything in `LIVE_PAYLOAD` (`src/lib/live.ts`). The ping is empty by design.
- Skip the ping for the owner's tab. Every tab refreshes on every change; a tab
  that *didn't* refresh would itself be the tell.
- Answer the ping with `router.refresh()`. It clears the Client Cache for the
  current route only, so a family grid the viewer tapped away from would keep
  its pre-change counts and be replayed from memory. `syncFromLive`
  (`src/app/actions/live.ts`) purges all of it.

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
   `data.length === 0` rather than pre-checking with a separate read. Anything
   else that must hold at write time belongs in the same predicate — that is
   where `.is("claimed_by", null)` lives on the owner's edit and delete.
5. `revalidatePath("/", "layout")` then `await notifyChanged()`.

Return `ActionResult`, never throw for expected failures.

Those five steps bind every action that touches data. There is exactly one
exception, and it is not a precedent: `syncFromLive` (`src/app/actions/live.ts`)
takes no input, reads no table and writes no row — its whole body is
`revalidatePath("/", "layout")`, which purges the *caller's own* Client Cache.
An anonymous POST re-renders the poster's own current route and learns nothing.
Deriving the caller there would put two auth round trips back on the hottest
path in the app, in every open tab, on every write. Anything that touches data
follows all five.

## Dialogs

Three of them, all in `add-wish-dialog.tsx` and `edit-wish-dialog.tsx`. Picking
the primitive picks the behaviour on a phone, and that is the whole API:

- **`Dialog` fills the screen** below `sm:` — header pinned, middle scrolling,
  action pinned to the bottom edge — and is the centred card from `sm:` up. Forms
  go here.
- **`AlertDialog` is a centred card at every size.** Questions go here. A
  destructive confirmation blown up to full-screen invites the mis-tap it exists
  to prevent.

Everything they share lives in `src/components/ui/dialog-styles.ts`. The two
files are forks that had drifted apart once already; put a shared value there
rather than in one of them.

Three things will bite:

- **Padding is on the regions, not the panel.** Every child of a `*Content` must
  be a `*Header`, `*Body` or `*Footer`, or it renders flush against the edge.
  `DeleteWishButton`'s non-final error paragraph is the one that caught this.
  The single exception is a wrapper that passes the regions through: `WishForm`
  is a `<form>` around a body and a footer, because the submit button has to be
  inside the form it submits. `flex min-h-0 flex-1 flex-col` is what makes it
  transparent — without `min-h-0` a flex child will not shrink below its
  content, the form outgrows the panel and the footer leaves the screen.
- **The seams are 12 + 4, not 16 + 0.** The body's 4px is what keeps
  `:focus-visible` — 2px outline at 2px offset — from being clipped by its own
  `overflow-y-auto`. Change one side of a seam and you owe the other its
  complement.
- **A `max-w-*` passed to `DialogContent` must be `sm:`-qualified.** Unprefixed,
  tailwind-merge cannot see it against the primitive's breakpoint-scoped width,
  so it leaks down to the phone and un-fullscreens the panel.

`interactiveWidget: "resizes-content"` in the root layout viewport is what keeps
the pinned button above the on-screen keyboard. **Chromium only** — Safari does
not implement it, so on iOS the keyboard still covers the footer; the body
scrolls, so nothing is unreachable. There is no CSS-only fix.

## Gotchas

- **`src/proxy.ts`, not `middleware.ts`.** Next 16 renamed the convention;
  Supabase's guides still say middleware and such a file would never run.
- **Migrations reach production by hand**, pasted into the Supabase SQL editor.
  `0002_realtime.sql` is a comment file — **do not run it there**.
  `0003_auth.sql` truncates all data. `0004_claim_notices.sql` adds the
  buyer-notice table and its triggers; it deletes nothing and alters no existing
  table. `0005_drop_claim_notices.sql` drops all three again — it is a forward
  migration rather than a deletion of `0004`, because production already had
  `0004` pasted in by hand. It touches no wish and no member.

  Locally they are applied by `npm run db:reset`, which runs all five in order.
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
