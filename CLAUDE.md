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

Run `npm run typecheck && npm run lint && npm test` before claiming work is done.

## The one rule

**A list owner must never learn that one of their own wishes has been claimed.**
Everyone else sees claims; the owner does not. Every design oddity here follows
from that. Enforced in four places — change one and you must check the rest:

1. `getWishListFor` (`src/lib/queries.ts`) selects `OWNER_WISH_COLUMNS` on the
   owner path, so claim columns never leave the database.
2. `OwnerWish` (`src/lib/types.ts`) has no claim fields, making a leak a type error.
3. `toOwnerWish` builds an explicit object instead of spreading the row.
4. `src/lib/wishes.test.ts` pins it down.

Never do these:

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
- **Migrations are run by hand** in the Supabase SQL editor. `0002_realtime.sql`
  is a comment file — **do not run it**. `0003_auth.sql` truncates all data.
- **All user-facing strings are Slovak**, including validation messages.
  `wishCount()` in `src/lib/utils.ts` handles 1 / 2–4 / 5+ plural forms.
- **`export const dynamic = "force-dynamic"`** in the root layout. Nothing may be
  prerendered or cached between visitors.
- **No service worker**, deliberately — cached HTML could show an owner their own
  claims. `experimental.useOffline` in `next.config.ts` covers offline instead.
- Tests cover **pure functions only** (`access`, `live`, `wishes`, `manifest`,
  `utils`) —
  no mocks, no DB. Keep new logic pure enough to test that way.
- `AGENTS.md` is written by `next dev`, not by you. It reappears after every dev
  run; commit it with your work rather than fighting it.
- Path alias `@/*` → `./src/*`.
