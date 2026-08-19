# Family Wish List

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Radix · Supabase.
UI language is **Slovak**.

Documentation lives in [`docs/`](docs/README.md) — product behaviour under
`docs/content/`, configuration under `docs/setup/`. **Do not restate it here or
in code comments; link to it.**

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on :3000, against the local Docker stack |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (`src/**/*.test.ts`, node env) |
| `npm run db:start` / `db:stop` / `db:status` | Local Supabase stack in Docker |
| `npm run db:reset` | Rebuild the local DB from `supabase/migrations/` |
| `npm run db:seed` | Fake family — run it *after* signing in |

Run `npm run typecheck && npm run lint && npm test` before claiming work is done.

Nothing works until `npm run db:start` is running.
Setup: [`docs/setup/local-development.md`](docs/setup/local-development.md).

## The one rule

**A list owner must never learn who claimed one of their own wishes, and must
never be shown claims while reading their own list. The secret ends only when
the giver ends it, by marking the gift handed over — and never any other way.**

Enforced in nine places, listed in
[`docs/content/privacy-rule.md`](docs/content/privacy-rule.md#where-the-rule-is-enforced).
Change one and check the rest.

One deliberate exception: an owner cannot edit or delete a **reserved** wish, and
the refusal says so without saying by whom. Do not hide that refusal, and do not
extend it by showing claim state on the owner's list.

The end of the secret is `fulfilWish` and the two history pages
([`docs/content/history.md`](docs/content/history.md)). It is the giver's
decision alone.

Never:

- Add an RLS policy to any table. RLS is on with **zero policies** on purpose.
- Enable `postgres_changes`.
- Put anything in `LIVE_PAYLOAD` (`src/lib/live.ts`).
- Skip the live ping for the owner's tab.
- Answer the ping with `router.refresh()` — use `syncFromLive`.
- Select `claimed_by` on any owner-serving path — including
  `src/app/wish-photo/[wishId]/route.ts`, which an owner hits for their own
  photos. `lookUpRefusal` (`src/app/actions/wishes.ts`) is the single exception
  and stays in that file.
- Add a Storage policy either. The `wish-photos` bucket is private and reached
  only through the `service_role` client.
- Write `fulfilled_wishes` from anywhere but `fulfil_wish`, or call
  `fulfil_wish` for anybody but the holder of the claim.
- End the secret on the giver's behalf — no cron, no admin override, no date.

## Two Supabase clients — never mix them

- `src/lib/supabase-auth.ts` → the visitor's session. Answers *who is this*.
  Reads no table. Calling `.from()` on it returns empty, which reads as "no rows"
  rather than "no access" — always a bug.
- `src/lib/supabase.ts` → `service_role`, bypasses RLS, does all data work.
  `import "server-only"` keeps it out of client bundles.

## Server Actions

Reachable by direct POST, so each one must, in order:

1. `const current = await getCurrentMember()` — re-derive the caller; never trust
   a client-supplied id. Returns only **approved** members.
2. Admin-only work: `await requireAdmin()`. An admin-only **page** re-checks with
   `isAdmin()` in its own body and redirects. A hidden menu item is not a guard.
3. Validate input with Zod. **Error messages are Slovak.**
4. Put ownership in the `WHERE` clause (`.eq("member_id", current.id)`) and check
   `data.length === 0`. Never pre-check with a separate read. Anything else that
   must hold at write time goes in the same predicate — that is where
   `.is("claimed_by", null)` lives.
5. `revalidatePath("/", "layout")` then `await notifyChanged()`.

Return `ActionResult`, never throw for expected failures. Set `final: true` only
when repeating the call cannot change the outcome.

`syncFromLive` (`src/app/actions/live.ts`) is the one exception to all five — it
takes no input, reads no table and writes no row. Anything that touches data
follows all five.

## Dialogs

- **`Dialog`** fills the screen below `sm:`, centred card above. Forms go here.
- **`AlertDialog`** is a centred card at every size. Questions go here.

Shared values live in `src/components/ui/dialog-styles.ts` — put them there, not
in one of the two forks.

- Every child of a `*Content` must be a `*Header`, `*Body` or `*Footer`, or it
  renders flush against the edge. A wrapper that passes the regions through needs
  `flex min-h-0 flex-1 flex-col`.
- Seams are 12 + 4. Change one side and you owe the other its complement.
- A `max-w-*` on `DialogContent` **must** be `sm:`-qualified.

Details: [`docs/content/ui-patterns.md`](docs/content/ui-patterns.md#dialogs).

## Conventions

- **All user-facing strings are Slovak**, including validation messages.
  `wishCount()` (`src/lib/utils.ts`) handles 1 / 2–4 / 5+ plural forms.
- Path alias `@/*` → `./src/*`.
- Tests cover **pure functions only** (`access`, `live`, `wishes`, `members`,
  `manifest`, `utils`) — no mocks, no DB. Keep new logic pure enough to test that
  way.
- Comments explain what the code cannot say for itself, in a line or two. Longer
  reasoning belongs in `docs/`.
- `src/proxy.ts`, not `middleware.ts` — Next 16 renamed the convention.
- Root layout is `export const dynamic = "force-dynamic"`. Metadata routes that
  never vary (`icon`, `apple-icon`, `manifest`) pin themselves back to
  `force-static`.
- Each child of the root layout supplies its own `<main className="flex-1">`.
- No service worker, ever.
- `AGENTS.md` is written by `next dev`, not by you. Commit it with your work.

## Database

- **Migrations reach production by hand.** Never run `supabase link`,
  `supabase db push`, `supabase db pull`, or `supabase db reset --linked` — the
  CLI would replay `0003_auth.sql` and its `truncate`.
- The Supabase CLI is **not** a dependency; `npm run supabase` is a pinned `npx`.
- `0002_realtime.sql` is a comment file — do not run it in production.

Full notes: [`docs/setup/database.md`](docs/setup/database.md).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
