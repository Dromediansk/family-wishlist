# Technical context

How the app is built. Patterns and standards, not a description of the code —
if a statement here would go stale when a function is renamed, it does not
belong in this file.

For what the app is for, see [Project context](project-context.md).

## Technologies

| Layer | Choice |
|---|---|
| Framework | Next.js 16, App Router, React 19 |
| Language | TypeScript, `strict` |
| Styling | Tailwind CSS 4, Radix UI primitives, shadcn-derived components |
| Database | Supabase Postgres |
| Auth | Supabase Auth, Google provider only |
| Files | Supabase Storage, one private `wish-photos` bucket |
| Live updates | Supabase Realtime broadcast |
| Validation | Zod 4 |
| Languages | next-intl 4, Slovak and English, locale in a cookie |
| Tests | Vitest, node environment |
| Hosting | Vercel. Nothing needs a long-running process, so any Next.js host would do |

Next.js 16 has breaking changes from earlier versions. Read the relevant guide
under `node_modules/next/dist/docs/` before writing framework code.

## Architectural patterns

### Everything runs on the server

The browser never talks to Postgres. Every read and write happens in a Server
Component, a Server Action or a route handler, using the `service_role` key.

**Two Supabase clients, never mixed:**

| Client | Answers | Reads tables |
|---|---|---|
| `src/lib/supabase-auth.ts` | *who is this* | never |
| `src/lib/supabase.ts` | everything else, as `service_role` | yes, bypassing RLS |

Calling `.from()` on the auth client returns empty, which reads as "no rows"
rather than "no access" — always a bug. `src/lib/supabase.ts` carries
`import "server-only"` to keep it out of client bundles.

### Row level security is on with zero policies

Deliberately, on every table. The one rule cannot be expressed as a policy — the
row belongs to the owner, so any policy letting them read it lets them read the
claim with it. Neither the anon key nor a signed-in session can reach anything.

Consequences that must be kept in mind:

- **No database check stands behind a read.** A query that forgot its filter
  would simply answer.
- **Triggers are still available**, and are used as the write-side backstop a
  policy cannot be. A trigger is not a policy.
- **A new function needs a `revoke`/`grant` pair.** Postgres grants `EXECUTE` to
  `PUBLIC`, which would let the anon key call it straight past the wall.

[decisions/privacy-rule.md](decisions/privacy-rule.md#why-it-cannot-be-a-database-policy)

### The data-layer chokepoint

Since no policy backs a read, a convention does:

- **Every table read lives in `src/lib/data/`.** Two ESLint rules make `.from()`
  and the `getSupabase` import errors elsewhere.
- **A function there takes a `Viewer` or a `GroupContext` first**, so the scope
  arrives before the query can be written.
- **Branded ids** (`src/lib/ids.ts`) are minted only in that directory, where a
  value has just been read from the column that defines it. A string off a URL
  cannot be passed where an id belongs.
- **A `Viewer` is built only in `src/lib/data/access.ts`.**

`src/app/actions/**` is exempt for **writes** only, never for a read — an
action's scope lives in its own `WHERE` clause. So the enforced guarantee covers
reads, pages and components; the write surface is governed by the rule below and
by review.

### Server Actions

Reachable by direct POST, so each one must, in order:

1. **Re-derive the caller.** `getViewer()` for person-level work,
   `enterGroup(groupId)` for anything group-scoped. A group id from the client
   is a claim; the membership row it returns is the proof.
2. **Admin work re-checks:** `requireGroupAdmin(groupId)`. An admin is an admin
   *of one group*. An admin-only page re-checks with `isGroupAdmin(ctx)` in its
   own body and redirects; a hidden menu item is not a guard.
3. **Validate with Zod.** Messages are **keys**, not sentences — a schema is
   built before any request has a language. `getErrorText()` words them.
4. **Put every precondition in the `WHERE` clause** and check
   `data.length === 0`. Ownership, group scope and `.is("claimed_by_user_id",
   null)` all live there. Never pre-check with a separate read.
5. **`revalidatePath("/", "layout")`, then `notifyChanged(groupIds)`** — or
   `notifyOwnerChanged(ownerId)` when a wish or a claim changed, since the owner
   is who every interested viewer has in common.

Two exceptions. `syncFromLive` (`src/app/actions/live.ts`) skips all five: it
takes no input, reads no table and writes no row. `setLocale`
(`src/app/actions/locale.ts`) keeps only 3 and 5: the language belongs to a
browser rather than an account — it has to work on `/login` — so there is no
caller to re-derive and no row to write, and it deliberately does not notify,
because nothing changed for anybody else.
[decisions/language.md](decisions/language.md)

### Conditional writes, never read-then-write

A precondition in the `WHERE` clause is the guard. Nothing is checked and then
written — that is what makes claiming and the frozen-wish refusal race-free.
Zero matched rows *is* the refusal, and the reason is looked up afterwards only
to choose the wording.

Where two tables must move together, one Postgres function does it in one
statement (`update_wish`, `fulfil_wish`) rather than two round trips.

### Types as the second lock

Where the rule can be expressed in the type system, it is: discriminated unions
whose wrong half has no field to render, and explicit field lists instead of
spreads. A leak becomes a type error rather than something to remember.

### Content-free live updates

The server broadcasts an **empty message** on a per-group channel. It says
*something changed* and nothing else. Every tab answers by calling
`syncFromLive`, which re-renders that tab's own route under that tab's own
cookie, so the redaction is re-applied where it always was and no wish data ever
travels over the socket.

Non-negotiable: `postgres_changes` stays off, `LIVE_PAYLOAD` stays empty, the
owner's tab gets pinged like everyone else's, and the answer is `syncFromLive`
rather than `router.refresh()`.

[decisions/live-updates.md](decisions/live-updates.md)

### Errors are values

Server Actions return `ActionResult`, never throw for expected failures:

```ts
type ActionResult = { ok: true } | { ok: false; error: string; final?: boolean }
```

`final: true` means repeating the call cannot change the outcome. The UI uses it
to swap the way forward for the way out.

## Coding standards

- **No user-facing string is written in a component.** Both languages live in
  `messages/sk.json` and `messages/en.json`, Slovak being the reference; the
  `Messages` declaration in `src/i18n/types.d.ts` turns a key missing from
  English into a compile error rather than a silent fallback. Counts are ICU
  plurals, because Slovak needs `one`/`few`/`other` where English needs two.
  Names still collate with `Intl.Collator("sk")` whichever language is on
  screen — that is a fact about the names, not the reader.
  [decisions/language.md](decisions/language.md)
- **Path alias** `@/*` → `./src/*`.
- **Comments explain what the code cannot say for itself**, in a line or two.
  Longer reasoning goes in `docs/decisions/`, linked from the comment.
- **Enforcement points of the privacy rule carry a `PRIVACY-RULE:` tag** in
  their doc comment. `rg 'PRIVACY-RULE:'` lists every one. Add a site, add a
  tag; no document needs editing.
- **Keep new logic pure enough to unit test** — no mocks, no database. Tests
  cover pure functions only.
- **Dialogs**: `Dialog` for forms (full-screen below `sm:`), `AlertDialog` for
  questions (centred at every size). Every child of a `*Content` must be a
  `*Header`, `*Body` or `*Footer`. Shared values go in
  `src/components/ui/dialog-styles.ts`, never in one of the two forks. A
  `max-w-*` on `DialogContent` must be `sm:`-qualified.
  [decisions/ui-patterns.md](decisions/ui-patterns.md#dialogs)
- **Busy state is `Button`'s `loading` prop.** The label never changes.
- **Each child of the root layout supplies its own `<main className="flex-1">`.**
  The root layout has none.
- `src/proxy.ts`, not `middleware.ts` — Next 16 renamed the convention.
- Root layout is `force-dynamic`. Metadata routes that never vary pin themselves
  back to `force-static`.

### Never

- Add an RLS policy to any table, or a Storage policy to the bucket.
- Enable `postgres_changes`.
- Put anything in `LIVE_PAYLOAD`.
- Select `claimed_by_user_id` on any owner-serving path. `lookUpRefusal` is the
  single exception and stays in `src/app/actions/wishes.ts`.
- Query a table outside `src/lib/data/`, or build a `Viewer` outside
  `src/lib/data/access.ts`.
- Write `fulfilled_wishes` from anywhere but `fulfil_wish`, or call
  `fulfil_wish` for anybody but the holder of the claim.
- End the secret on the giver's behalf — no cron, no admin override, no date.
- Add a service worker. Cached HTML could show an owner their own claims.
- Cache a rendered page anywhere a second visitor could reach it.

## Development practices

```bash
npm run db:start                              # local Supabase stack in Docker
npm run dev                                   # in another terminal
npm run typecheck && npm run lint && npm test # before claiming work is done
```

Nothing works until `db:start` is running.
[setup/local-development.md](setup/local-development.md)

- **Develop against the local Docker stack, never the hosted project.** Every
  value it needs is committed in `.env.development`; production values live in
  `.env.production.local`. Leave `.env.local` unused — it would outrank
  `.env.development` and silently point `npm run dev` at production.
- **Migrations reach production by hand**, pasted into the SQL editor in order.
  Never run `supabase link`, `db push`, `db pull` or `db reset --linked`: the CLI
  would read production as empty and replay `0003_auth.sql` and its `truncate`.
- **Tests are pure functions only.** No mocks, no database.
- **`AGENTS.md` is written by `next dev`, not by hand.** Commit it with the work.

## Dependency choices

Where an obvious alternative exists, this is which one and why.

| Instead of | We use | Because |
|---|---|---|
| Browser talks to Postgres via RLS | Server-only `service_role` | The one rule is not expressible as a policy |
| `postgres_changes` | Empty broadcast | It is RLS-filtered, so it would hand owners their own claim data |
| A service worker | `experimental.useOffline` | Cached HTML could show an owner their own claims |
| `next/font/google` | Self-hosted Atkinson Hyperlegible Next | Google's `latin` slice stops below every Slovak caron, and Next has no metrics entry for the family |
| `supabase` as a devDependency | `npx --yes supabase@<pinned>` | ~110 MB binary, ~300 MB unpacked on a build host, and the build never runs it |
| `URL.createObjectURL` | `data:` URL for photo previews | An object URL must be revoked by hand; every path that forgets leaks an image for the life of the tab |
| Uploading the original file | Canvas resize to WebP in the browser | It is the only reason an iPhone HEIC photo works at all, and re-encoding discards the EXIF GPS coordinates |
| Trusting `File.type` | Magic-byte sniffing (`src/lib/images.ts`) | A Server Action is reachable by direct POST, so the browser's claim is not evidence |
| A component library | Radix primitives + local shadcn forks | Two dialog forks are deliberate; shared values live in one file between them |
| Hashing invite tokens | Plaintext | A link already sent must be copyable again, and the database it would protect already holds every wish the token grants |
| `router.refresh()` | `revalidatePath("/", "layout")` | `refresh()` clears the Client Cache for the current route only |
| next-intl with a `[locale]` URL segment | next-intl with a cookie | `next/root-params` does not reach a Server Action, which is where a third of the sentences are raised — and a prefix would mean rewriting the proxy and every redirect |
| `negotiator` + `@formatjs/intl-localematcher` | A pure `pickLocale` | Two locales do not pay for two dependencies, and a pure function is testable |
