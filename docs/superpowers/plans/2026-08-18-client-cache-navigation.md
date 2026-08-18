# Client-Cache-Backed Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop showing a loading skeleton when navigating back to a page whose data has not changed, without ever serving a page that is stale with respect to a write.

**Architecture:** Turn on Next.js's in-memory Client Cache via `experimental.staleTimes`, and make the app's existing content-free "something changed" broadcast its invalidation signal. The browser side answers a ping with a new Server Action, `syncFromLive`, whose whole body is `revalidatePath("/", "layout")` — that purges every route the tab has cached, where the previous `router.refresh()` cleared only the route on screen.

**Tech Stack:** Next.js 16.3.1 (App Router), React 19, TypeScript, Supabase Realtime broadcast.

**Spec:** `docs/superpowers/specs/2026-08-18-client-cache-navigation-design.md` — read it first; this plan argues from it.

## Global Constraints

- **All user-facing strings are Slovak.** Nothing in this plan adds one, but do not introduce English copy if you find yourself needing a string.
- **`LIVE_PAYLOAD` (`src/lib/live.ts`) stays empty.** The ping must never describe what changed. This plan does not touch it, and `src/lib/live.test.ts` pins it.
- **Never skip the ping for the owner's tab.** Every tab purges and re-renders on every change. A tab that did not refresh would itself be the tell.
- **Tests cover pure functions only** — no mocks, no DB. Nothing in this plan is pure, so no unit test is added. Do not invent a mocked test; it would assert the mock. Verification is the existing suite plus the manual passes in Task 3.
- **`revalidatePath("/", "layout")` in the Server Actions stays as it is.** It is what keeps the writing tab from depending on its own broadcast returning.
- Run `npm run typecheck && npm run lint && npm test` before claiming any task done.
- `AGENTS.md` is rewritten by `next dev`. If it reappears, commit it with the work rather than fighting it.

## File Structure

| File | Responsibility |
|---|---|
| `src/app/actions/live.ts` | **new.** `syncFromLive` — the one Server Action that takes no input and touches no data. Purges the caller's Client Cache. |
| `src/components/live-refresh.tsx` | The browser side of the live channel. Changes what it calls on a ping; keeps the client, the debounce, the deaf-poll and the visibility catch-up untouched. |
| `next.config.ts` | Adds `experimental.staleTimes`. |
| `CLAUDE.md` | Records the named Server Action exception, and why `router.refresh()` is insufficient. |
| `README.md` | The *why* — updates the Live updates section, which currently describes `router.refresh()`. |

`syncFromLive` gets its own file rather than joining `wishes.ts` or `members.ts` because it belongs to neither domain and because its exemption from the Server Action checklist should be visible in the file listing, not buried among actions that do follow it.

---

### Task 1: Make the ping purge the whole Client Cache

Lands the invalidation change **before** anything is cached. On its own it is behaviour-neutral — nothing is in the Client Cache yet, so there is nothing extra to purge — which is exactly what makes it safe to land and review separately. Task 2 is what turns the caching on, and it is only correct because this task went first.

**Files:**
- Create: `src/app/actions/live.ts`
- Modify: `src/components/live-refresh.tsx` (whole comment block, imports, and the `refresh` closure)
- Modify: `CLAUDE.md:117-123` (the "Never do these" list) and `CLAUDE.md:150` (end of the Server Actions section)
- Modify: `README.md` — the "So the server broadcasts an **empty message**" paragraph in `## Live updates`, and the file list below it
- Test: none — see Global Constraints

**Interfaces:**
- Consumes: `LIVE_EVENT`, `LIVE_TOPIC` from `@/lib/live` (already imported by `live-refresh.tsx`)
- Produces: `syncFromLive(): Promise<void>`, exported from `src/app/actions/live.ts`. Task 2 does not call it; it only makes it load-bearing.

- [ ] **Step 1: Create the Server Action**

Create `src/app/actions/live.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

/**
 * Throws away everything the calling tab has cached.
 *
 * This is the browser's answer to the live ping, and it is the one Server
 * Action in the app that skips the checklist in CLAUDE.md: it takes no input,
 * reads no table and writes no row. `revalidatePath` purges the *caller's own*
 * Client Cache — every route that tab has visited, not just the one on screen —
 * and the action's response re-renders the current route with the caller's own
 * cookie, so the per-viewer redaction in `getWishListFor` is applied exactly as
 * it is on a first visit.
 *
 * An anonymous POST to this therefore re-renders the poster's own current route
 * and learns nothing. Re-deriving the caller here would put two auth round trips
 * back on the hottest path in the app — in every open tab, on every write — and
 * buy no safety at all.
 */
export async function syncFromLive(): Promise<void> {
  revalidatePath("/", "layout");
}
```

- [ ] **Step 2: Rewrite the comment block at the top of `LiveRefresh`**

In `src/components/live-refresh.tsx`, replace the block that begins `/**\n * Keeps every open tab in step with the database.` (it currently sits between the imports and `const DEBOUNCE_MS`) with:

```tsx
/**
 * Keeps every open tab in step with the database.
 *
 * Listens for the content-free "something changed" ping sent by the Server
 * Actions (see `src/lib/realtime.ts`) and answers it by calling `syncFromLive`,
 * whose whole body is `revalidatePath("/", "layout")`. That purges this tab's
 * Client Cache — every route it has visited, not only the one on screen — and
 * the action's response re-renders the current route with this visitor's
 * cookie, so the per-viewer claim redaction is re-applied on the server and no
 * wish data ever has to travel over the socket.
 *
 * `router.refresh()` used to do the second half of that, and cannot do the
 * first: it clears the Client Cache for the *current route only*. With
 * `staleTimes.dynamic` switched on in `next.config.ts`, a ping arriving while
 * the viewer sits on a wish list would refresh that list and leave the cached
 * family grid holding its pre-change counts — so tapping "Všetci" would land on
 * stale numbers, instantly, with no request to correct them.
 *
 * As with `router.refresh()` before it, the response is merged into the running
 * tree without discarding client state, so an open dialog and its half-typed
 * input survive an update landing.
 */
```

- [ ] **Step 3: Swap the imports**

At the top of the same file, delete the `useRouter` import and add `startTransition` and the action. The import block becomes:

```tsx
"use client";

import { startTransition, useEffect } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { syncFromLive } from "@/app/actions/live";
import { LIVE_EVENT, LIVE_TOPIC } from "@/lib/live";
```

Leaving `useRouter` imported fails lint, so this and Step 4 must land together.

- [ ] **Step 4: Point `refresh` at the action and empty the dependency array**

In the same file, change the component's opening and its `refresh` closure. `const router = useRouter();` goes away entirely, and the effect's dependency array becomes `[]` — it names nothing now, and it already ran once per mount in practice.

```tsx
export function LiveRefresh() {
  useEffect(() => {
    const supabase = getClient();
    if (!supabase) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let live = false;
    let everLive = false;

    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        startTransition(async () => {
          try {
            await syncFromLive();
          } catch (error) {
            // Cosmetic: the deaf-poll below and the staleTimes ceiling both
            // catch up. But say so — a permanently failing sync and a healthy
            // one look identical from the outside otherwise.
            console.warn("Live sync failed:", error);
          }
        });
      }, DEBOUNCE_MS);
    };
```

Everything from `const channel = supabase` down to the cleanup return is unchanged. Only the final line of the effect changes:

```tsx
  }, []);

  return null;
}
```

- [ ] **Step 5: Record the exception in CLAUDE.md**

In `CLAUDE.md`, immediately after the line `Return \`ActionResult\`, never throw for expected failures.` (currently line 150), add a blank line and:

```markdown
Those five steps bind every action that touches data. There is exactly one
exception, and it is not a precedent: `syncFromLive` (`src/app/actions/live.ts`)
takes no input, reads no table and writes no row — its whole body is
`revalidatePath("/", "layout")`, which purges the *caller's own* Client Cache.
An anonymous POST re-renders the poster's own current route and learns nothing.
Deriving the caller there would put two auth round trips back on the hottest
path in the app, in every open tab, on every write. Anything that touches data
follows all five.
```

- [ ] **Step 6: Add the `router.refresh()` warning to "Never do these"**

In `CLAUDE.md`, append a fourth bullet to the list under `Never do these:` (currently lines 118–123), after the "Skip the ping for the owner's tab" bullet:

```markdown
- Answer the ping with `router.refresh()`. It clears the Client Cache for the
  current route only, so a family grid the viewer tapped away from would keep
  its pre-change counts and be replayed from memory. `syncFromLive`
  (`src/app/actions/live.ts`) purges all of it.
```

- [ ] **Step 7: Update the README's description of the ping**

In `README.md`, the paragraph beginning `So the server broadcasts an **empty message**.` currently says every tab answers by calling `router.refresh()`. Replace that paragraph with:

```markdown
So the server broadcasts an **empty message**. It says "something changed" and
nothing else — not what changed, not whose list, not who did it. Every open tab
answers it by calling `syncFromLive`, a Server Action that throws away
everything that tab has cached and re-runs the page on the server as whoever is
signed in there. The redaction is applied where it always was, in
`getWishListFor`, and no wish data ever travels over the socket.
```

Then add a bullet to the file list further down that section, directly after the `src/lib/realtime.ts` bullet:

```markdown
- `src/app/actions/live.ts` — `syncFromLive`, the one Server Action that reads
  nothing and writes nothing
```

- [ ] **Step 8: Verify the suite is green**

Run: `npm run typecheck && npm run lint && npm test`
Expected: typecheck clean, lint clean (this is where a leftover `useRouter` import would surface), all Vitest tests pass. `src/lib/live.test.ts` must still pass untouched — the payload did not change.

- [ ] **Step 9: Verify live updates still work at all**

This replaces the mechanism the whole feature rests on, so confirm it end to end before moving on. With `npm run db:start` running and a seeded family (`npm run db:seed` after signing in):

Run: `npm run dev`

In two browser profiles signed in as two different members, with profile A on `/` and profile B on `/member/<A's id>`: have B claim one of A's wishes. Within about a second, **B's own view updates** and **A's tab re-renders** (A must still see no claim indication and a bare total on their own card). Then have A add a wish from the dialog on `/` and confirm B's grid count moves.

Expected: both directions work exactly as they did before this task. If nothing updates, check the browser console for "Live sync failed" and the server console for "Live update ping failed".

- [ ] **Step 10: Commit**

```bash
git add src/app/actions/live.ts src/components/live-refresh.tsx CLAUDE.md README.md
git commit -m "Purge the whole client cache on a live ping

router.refresh() clears the Client Cache for the current route only, which
is about to matter: with staleTimes on, a cached family grid would keep its
pre-change counts after a claim landed on a list the viewer had open.
syncFromLive is a Server Action whose whole body is revalidatePath, so it
purges every route the tab has visited and re-renders the current one in
the same round trip."
```

---

### Task 2: Turn on the Client Cache

**Files:**
- Modify: `next.config.ts`
- Modify: `CLAUDE.md` (the `## Gotchas` list, currently starting at line 191)
- Modify: `README.md` (new subsection at the end of `## Live updates`)
- Test: none — see Global Constraints

**Interfaces:**
- Consumes: `syncFromLive` from Task 1 must already be what answers the ping. If it is not, this task introduces a real staleness bug rather than a feature.
- Produces: nothing importable.

- [ ] **Step 1: Add `staleTimes` to the Next config**

In `next.config.ts`, add `staleTimes` to the existing `experimental` block, keeping `useOffline` and its comment exactly as they are:

```ts
const nextConfig: NextConfig = {
  experimental: {
    /**
     * Holds failed navigations, prefetches and Server Actions instead of
     * throwing, and retries them once the connection is back. Phones on a weak
     * signal are the normal case here, and this replaces a service worker —
     * which we deliberately don't have, because every route renders differently
     * per viewer and cached HTML could show someone their own claimed wishes.
     */
    useOffline: true,

    /**
     * How long the browser may replay a page it has already visited instead of
     * asking the server again. Every route here is dynamic (`force-dynamic` in
     * the root layout), and Next's default for dynamic routes is 0 — which is
     * why tapping back out of a wish list used to show the skeleton a second
     * time for data that had not changed.
     *
     * 60 seconds is not a freshness target. Every write pings, and every ping
     * purges the whole cache in every tab (`syncFromLive`), so a page is
     * replayed only while nothing has changed anywhere. This is the ceiling for
     * a tab whose socket died without saying so and whose 30s deaf-poll and
     * visibilitychange catch-up both missed.
     */
    staleTimes: { dynamic: 60, static: 180 },
  },
};
```

- [ ] **Step 2: Verify the config typechecks**

Run: `npm run typecheck`
Expected: clean. `staleTimes` is experimental but typed on `NextConfig`; a failure here means the key is misspelled or nested wrong, not that the feature is unavailable.

- [ ] **Step 3: Add the Gotchas entry to CLAUDE.md**

In `CLAUDE.md`, add a bullet to the `## Gotchas` list:

```markdown
- **The browser replays visited pages.** `experimental.staleTimes` in
  `next.config.ts` (`dynamic: 60`) lets a route the viewer has already visited
  render from memory instead of re-fetching, which is what stops the skeleton
  appearing on the way back. It is honest only because every write pings and
  every ping purges the whole cache via `syncFromLive`; the 60s is the ceiling
  for a tab whose socket died silently. What is cached is the payload the server
  had already redacted for that viewer, in memory, per tab, dropped on reload —
  sign-in is a full page load and sign-out deletes the cookies, either of which
  empties it, so no payload survives a change of who is looking.
```

- [ ] **Step 4: Explain it in the README**

In `README.md`, at the end of the `## Live updates` section (after the paragraph about the channel being public), add:

```markdown
### Why going back doesn't reload

Tapping a member and then tapping back used to show a loading skeleton both
ways. Next.js does keep visited pages in memory, but only for as long as
`experimental.staleTimes.dynamic` allows — and its default is zero, so every
page here was thrown away the moment you left it. Setting it to 60 seconds is
what makes going back instant.

That is only honest because of the ping. A page is replayed from memory only
while nothing has changed anywhere: every write broadcasts, and every broadcast
empties the whole cache in every tab. The 60 seconds is the ceiling for a tab
whose socket died without saying so, not a freshness target.

Nothing new is stored by doing this. The cache holds the same per-viewer pages
the server had already decided to send, in memory, per tab, gone on reload —
and an owner's own page has no claim data in it to cache in the first place.
```

- [ ] **Step 5: See the skeleton disappear**

Run: `npm run dev`

Signed in, from `/`: tap a member, then tap "Všetci". The first tap into that member still shows the wish-list skeleton. The tap back must render the family grid **with no skeleton at all**. Repeat into a second member and back.

(Automatic `<Link>` prefetching is production-only, but that is not what this step exercises — the cache entry being replayed was created by the actual visit, so `next dev` shows it. Task 3 confirms the whole thing on a real build.)

Expected: no `HomeLoading` skeleton on the way back. If it still flashes, the config did not take — restart `next dev`, since `next.config.ts` is not hot-reloaded.

- [ ] **Step 6: Run the suite**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all clean.

- [ ] **Step 7: Commit**

```bash
git add next.config.ts CLAUDE.md README.md
git commit -m "Keep visited pages in the browser for 60s

staleTimes.dynamic defaults to 0 and every route here is force-dynamic, so
a page was discarded the moment you left it and going back re-fetched data
that had not changed. Safe now that a ping purges the whole client cache:
a page is replayed only while nothing has changed anywhere, with 60s as the
ceiling for a tab whose socket died silently."
```

---

### Task 3: Acceptance pass

The gate. Everything above is one config key and one changed call site; what needs proving is that the combination is correct under two viewers, and that the privacy rule and the surviving-dialog behaviour both still hold. A reviewer can reject this while approving Tasks 1 and 2.

**Files:**
- Modify: none unless a check fails
- Test: manual, two browser profiles

**Interfaces:**
- Consumes: Tasks 1 and 2, both landed.
- Produces: nothing.

**Where to run it.** Run checks 1–6 under `npm run dev` against the local Docker stack. Do **not** reach for `npm run build && npm start` locally to get a production build: `next build` and `next start` load `.env.production.local`, which points at the hosted database — checks 2, 3 and 4 all write, and they would write to real family data. Confirm the production behaviour on a Vercel preview deployment instead (Step 8), where prefetching is on and the environment is the real one.

Sign in as three members in three profiles: **A**, **B**, **C**. `npm run db:seed` (after a first sign-in) gives you the family.

- [ ] **Step 1: No skeleton on the way back**

A: `/` → tap C → tap "Všetci".
Expected: the family grid appears immediately, no `HomeLoading` skeleton.

- [ ] **Step 2: The case that proves it**

A sits on `/member/<C>`. B claims one of C's wishes. A then taps "Všetci".
Expected: C's card on A's grid shows the **post-claim** free count. This is the check `router.refresh()` alone fails — if the count is the pre-claim one, `syncFromLive` is not what is answering the ping.

- [ ] **Step 3: The owner still learns nothing**

C sits on `/member/<C>` (their own list). B claims one of C's wishes.
Expected: C's tab re-renders, and C's list shows no claim indication of any kind — no badge, no dimming, no wording. C then taps "Všetci": their own card shows a bare total, not "n / m".

- [ ] **Step 4: Client state survives the merge**

A opens the add-wish dialog on their own list and types a title without submitting. B claims a wish from C's list, firing a ping.
Expected: A's dialog stays open and the half-typed title is still there. This was a documented property of `router.refresh()` and must not have been lost in the switch to the action.

- [ ] **Step 5: Identity change empties the cache**

In one profile: browse to a member's list, sign out, sign in as a different member, browse to the same member's list.
Expected: the page reflects the *new* viewer — in particular, if the new viewer is that list's owner, no claim state appears.

- [ ] **Step 6: Approval still reaches the waiting screen**

A new account signs in and waits on `/pending`. An admin approves them.
Expected: the pending screen turns into the app by itself, as before. This is the ping doing a job it was not designed for, and the switch to the action must not have broken it.

- [ ] **Step 7: Run the suite one more time**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all clean.

- [ ] **Step 8: Confirm on a preview deployment**

Push the branch, open the Vercel preview, and repeat Steps 1–3 there on a phone if possible. This is the only place `<Link>` prefetching is active and the round trips are the real ones.
Expected: same results, and the first tap into a member is noticeably the only place a skeleton appears.

- [ ] **Step 9: Commit any fixes and record the result**

If every check passed there is nothing to commit from this task — say so explicitly in the handoff rather than inventing a commit. If a check failed, fix it in the file it belongs to and commit with a message naming the check that caught it.

---

## Out of scope

Named here so nobody folds them in:

- **`useOptimistic` on the claim button.** Would make the claim flip without waiting for the round trip. Deliberately parked.
- **Cache Components / Partial Prefetching.** The direction Next is heading; rejected for now in the spec's "Approaches considered".
- **The server latency work** — `getClaims()` in place of `getUser()`, and parallelising `getAccess()` with `getMemberById()` in `/member/[id]`. This is the follow-up in the spec, and it has a prerequisite to confirm first (the Supabase project must be on asymmetric JWT signing keys). It gets its own spec and plan.
