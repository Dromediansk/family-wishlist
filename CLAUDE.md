# Family Wish List

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 4 · Radix · Supabase.
One account, many groups — a family, a team, a circle of friends — each with its
own names and roles. UI is **Slovak and English**; Slovak is the default.

## Read these

| Before | Read |
|---|---|
| Any change | [`docs/project-context.md`](docs/project-context.md) — purpose, entities, business rules |
| Writing code | [`docs/technical-context.md`](docs/technical-context.md) — patterns, standards, practices |
| Touching an area | the matching file in [`docs/decisions/`](docs/decisions/README.md) |
| Writing any user-facing string | [`docs/decisions/language.md`](docs/decisions/language.md) — two locales, one catalogue |
| Running or deploying | [`docs/setup/`](docs/setup/local-development.md) |

**Do not restate those documents here or in code comments — link to them.**

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

## The one rule

**A list owner must never learn who claimed one of their own wishes, and must
never be shown claims while reading their own list. The secret ends only when
the giver ends it, by marking the gift handed over — and never any other way.**

Every enforcement point carries a `PRIVACY-RULE:` tag in its doc comment.
**`rg 'PRIVACY-RULE:'` is the list** — change one and check the rest. Add a
site, add a tag; no document needs editing. Three more sites live in the
database: `wishes_check_claim_peer`, `memberships_release_claims` and
`fulfil_wish`.

One deliberate exception: an owner cannot edit or delete a **reserved** wish,
and the refusal says so without saying by whom. Do not hide that refusal, and do
not extend it by showing claim state on the owner's list.

Full reasoning: [`docs/decisions/privacy-rule.md`](docs/decisions/privacy-rule.md).

## Never

- Add an RLS policy to **any** table — `app_users`, `groups`, `memberships` and
  `invites` included. RLS is on with **zero policies** on purpose.
- Add a Storage policy. The `wish-photos` bucket is private and reached only
  through the `service_role` client.
- Enable `postgres_changes`, or put anything in `LIVE_PAYLOAD`
  (`src/lib/live.ts`).
- Skip the live ping for the owner's tab, or answer the ping with
  `router.refresh()` — use `syncFromLive`.
- Select `claimed_by_user_id` on any owner-serving path, including
  `src/app/wish-photo/[wishId]/route.ts`. `lookUpRefusal`
  (`src/app/actions/wishes.ts`) is the single exception and stays in that file.
- Query a table outside `src/lib/data/`, or build a `Viewer` outside
  `src/lib/data/access.ts`. Two lint rules enforce the first;
  `src/app/actions/**` is exempt for **writes** only, never for a read.
- Write `fulfilled_wishes` from anywhere but `fulfil_wish`, or call
  `fulfil_wish` for anybody but the holder of the claim.
- End the secret on the giver's behalf — no cron, no admin override, no date.
- Add a service worker.
- Run `supabase link`, `db push`, `db pull` or `db reset --linked`. Migrations
  reach production **by hand**; the CLI would replay `0003_auth.sql` and its
  `truncate`.

## Two Supabase clients — never mix them

- `src/lib/supabase-auth.ts` → the visitor's session. Answers *who is this*.
  Reads no table. Calling `.from()` on it returns empty, which reads as "no
  rows" rather than "no access" — always a bug.
- `src/lib/supabase.ts` → `service_role`, bypasses RLS, does all data work.
  `import "server-only"` keeps it out of client bundles.

## Server Actions

Reachable by direct POST, so each one must, in order:

1. Re-derive the caller — `getViewer()`, or `enterGroup(groupId)` for anything
   group-scoped. A group id from the client is a claim; the membership row it
   returns is the proof.
2. `await requireGroupAdmin(groupId)` for admin-only work. An admin-only **page**
   re-checks with `isGroupAdmin(ctx)` in its own body and redirects. A hidden
   menu item is not a guard.
3. Validate input with Zod. **Error messages are Slovak.**
4. Put every precondition in the `WHERE` clause — ownership, `.eq("group_id",
   ctx.groupId)`, `.is("claimed_by_user_id", null)` — and check
   `data.length === 0`. Never pre-check with a separate read.
5. `revalidatePath("/", "layout")` then `await notifyChanged(groupIds)` — or
   `await notifyOwnerChanged(ownerId)` when a wish or a claim changed.

Return `ActionResult`, never throw for expected failures. Set `final: true` only
when repeating the call cannot change the outcome.

Two exceptions: `syncFromLive` (`src/app/actions/live.ts`) skips all five, and
`setLocale` (`src/app/actions/locale.ts`) keeps only 3 and 5 — the choice is a
browser's, not an account's, so there is no caller to re-derive, no row to write
and deliberately **no `notifyChanged`**.

## Conventions

- **No user-facing string is written in a component.** Both languages live in
  `messages/sk.json` and `messages/en.json`; Slovak is the reference, and the
  `Messages` type makes a key missing from English a compile error. Zod messages
  and `ActionResult.error` are **keys**, worded by `getErrorText()`
  (`src/i18n/errors.ts`) inside the action. Counts are ICU plurals — Slovak
  needs `one`/`few`/`other`. `Intl.Collator("sk")` deliberately does *not*
  follow the reader; `formatDate` does.
- Path alias `@/*` → `./src/*`.
- Tests cover **pure functions only** — no mocks, no DB. Keep new logic pure
  enough to test that way.
- Comments explain what the code cannot say for itself, in a line or two.
  Longer reasoning belongs in `docs/decisions/`, linked from the comment.
- Dialogs: `Dialog` for forms, `AlertDialog` for questions. Every child of a
  `*Content` must be a `*Header`, `*Body` or `*Footer`. Shared values go in
  `src/components/ui/dialog-styles.ts`. A `max-w-*` on `DialogContent` **must**
  be `sm:`-qualified. Seams are 12 + 4.
- `src/proxy.ts`, not `middleware.ts` — Next 16 renamed the convention.
- Root layout is `export const dynamic = "force-dynamic"`; metadata routes that
  never vary pin themselves back to `force-static`. It also owns the whole
  shell — header, the one `<main className="flex-1">`, footer — so no page
  brings its own. [`docs/decisions/ui-patterns.md`](docs/decisions/ui-patterns.md#layout-contract)
- `AGENTS.md` is written by `next dev`, not by you. Commit it with your work.

## Documentation

Adding a feature usually needs **no documentation change**. Update a doc only
when a rule or a decision changed — not to describe new code. See
[`docs/README.md`](docs/README.md#what-goes-where).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
