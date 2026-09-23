# Testing

Two suites that do not overlap.

| Suite | Covers | Costs |
|---|---|---|
| Vitest (`src/**/*.test.ts`) | Pure functions. No mocks, no database, no DOM | milliseconds |
| Playwright (`e2e/`) | Journeys through the real local stack, in a real browser | seconds, and Docker |

## What belongs in e2e

**Happy paths, and the one rule. Nothing else.**

A journey is a thing a person came to do, start to finish: add a wish, reserve
somebody else's, hand it over. One test per journey — not one per assertion.

The one rule is here for a reason that looks like an exception and is not.
*The owner is never told* is a negative statement about a rendered page, held
up by every site `rg 'PRIVACY-RULE:'` lists plus three in the database. Each is
individually correct; nothing else checks that they compose. It needs two
actors and two browser contexts, so no unit test can express it.

**If it can be a pure unit test, it must be one.** Refusals, validation,
wording, races, expiry arithmetic and locale negotiation are all cheaper and
better covered in Vitest. Reach for Playwright only when the answer depends on
a real request, a real cookie or a real render.

## The rules

- **Data comes from `world` and nowhere else.** No test writes its own rows, no
  test reads another test's rows, no test depends on `npm run db:seed` — that
  anchors on whoever is signed in, which is a human.
- **Every run is isolated by its group.** A group is already the boundary that
  decides who sees whom, so it is the boundary a test gets. Identifiers carry a
  run id; files run in parallel.
- **Teardown deletes the accounts, not the rows** — with one exception it has
  to name. The `on delete cascade` chain takes the memberships, the wishes, the
  `wish_groups`, the notes and the invites with them. It does **not** take
  `fulfilled_wishes`: both of that table's foreign keys are `on delete set
  null` (`0008_multi_tenant.sql`), because a gift that changed hands has to
  outlive either party leaving. So a test that hands a gift over deletes its
  own history rows *before* the accounts go — afterwards both id columns are
  null and the run's rows are indistinguishable from anyone else's. A table
  added later with the same shape owes the same line.
- **E2E only ever runs against loopback.** The fixtures hold `service_role`.
  They have to be incapable of reaching the hosted project, not merely unlikely
  to — the same guard `scripts/seed-dev.mjs` carries, for the same reason.
- **No Slovak sentence is written in a test file.** Locate by role, or import
  the key from `messages/sk.json`. A copied string forks the catalogue that
  [language](language.md) exists to keep single.
- **The browser context is pinned to `sk-SK`.** Slovak is the app's fallback,
  not what every browser sends — negotiation follows `Accept-Language`
  ([language](language.md)) — so an unpinned run would pass or fail by the
  operator's locale rather than the app's.
- **No `waitForTimeout`.** A live update is an empty broadcast answered by
  `syncFromLive` ([live updates](live-updates.md)); only auto-retrying
  assertions are correct, and a sleep that passes on a fast machine is a
  failure waiting for a slow one.
- **Assert through the UI.** Reading rows back to check them re-tests
  `src/lib/data/`, which Vitest and the type system already hold.
- **Nothing test-only goes in `src/`.** Sessions are minted out of band; see
  [identity and sessions](identity-and-sessions.md#sessions).

## What nothing walks

**Creating a group.** `world` inserts its group and both memberships with
`service_role`, because the world has to exist before the first page loads. So
`createGroup` (`src/app/actions/groups.ts`) is covered by neither suite: not by
Vitest, which cannot reach a Server Action, and not here. That leaves its
[creation cap](groups-and-invites.md#the-creation-cap), the admin membership it
writes beside the group, and its Zod validation unexercised end to end.

It is left that way on purpose — the scope above is journeys plus the one rule,
and this is a fixture shortcut rather than a journey nobody thought of. If it is
ever wanted, it is a journey of its own: `createAccount` a fresh, groupless
person, land them on `/start`, create a group through the form, and assert the
grid shows them as its admin.

## Running it

    npm run db:start
    npx playwright install chromium   # once per machine
    npm run test:e2e

`npm ci` installs `@playwright/test` but not the browser it drives, so a machine
that has never run the suite fails with *Executable doesn't exist at
…/chromium-…*. It is not a `postinstall` hook on purpose: a ~150 MB download on
every install is a tax on everyone who never runs Playwright.

`npm test` is Vitest alone, and the `typecheck && lint && test` gate stays that
way — it has to keep working with Docker stopped.
