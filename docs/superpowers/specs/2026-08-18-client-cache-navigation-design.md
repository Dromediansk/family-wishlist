# Instant back-navigation via the Next.js Client Cache

Date: 2026-08-18
Status: approved, not yet implemented

## The problem

Every navigation shows a loading skeleton, including navigations back to a page
whose data has not changed — tapping "Všetci" from a member's wish list is the
case that prompted this.

Two independent causes:

**Nothing is cached in the browser.** `export const dynamic = "force-dynamic"`
in the root layout makes every route dynamic. Since Next 15 the default for
`staleTimes.dynamic` is `0`, so a visited page's RSC payload is discarded the
moment you leave it. Every route also has a `loading.tsx`, which means `<Link>`
prefetches only down to the loading boundary — so a tap is *guaranteed* to
render the skeleton and then wait for a server round trip. Both are Next
defaults the app has never opted out of, not something it built.

**The round trip is long enough to see.** `/member/[id]` costs four sequential
network hops before any HTML exists:

1. `proxy.ts` → `supabase.auth.getUser()` — a real HTTP call to Supabase Auth
2. `getAccess()` → `getAuthUser()` → `supabase.auth.getUser()` **again**
   (`cache()` dedupes within one render; the proxy ran in a different one)
3. `getMemberById(id)`
4. `getWishListFor(...)`

This spec addresses the first cause only. The second is a named follow-up.

## Approaches considered

**Client Cache + ping-driven global invalidation** — chosen. Described below.

**Cache Components + Partial Prefetching** — rejected for now. Next 16's newer
model: mark the shell `use cache`, wrap per-viewer data in Suspense, and let
`<Link>` prefetch a shared App Shell while data streams behind it. It is where
Next is heading, but its payoff is a *faster skeleton*, not *no skeleton*, so it
does not solve the stated problem. It also asks for `use cache` boundaries to be
drawn by hand around components whose entire design premise is that their output
differs per viewer; one mis-scoped boundary is the leak the eight-place rule in
CLAUDE.md exists to prevent. Wrong risk for the reward. Revisit if the app
adopts Cache Components for other reasons.

**A client store (Zustand or similar)** — rejected. Filling a client store needs
a client-reachable endpoint returning wish data, which gives the per-viewer
redaction a second implementation to keep in sync with `getWishListFor`'s two
column lists, and starts moving claim data to browsers over a route that is not
the RSC payload. That is a new surface for the one rule to break, bought in
exchange for a cache the app already has and has not switched on. The Client
Cache stores the same already-redacted payload the server chose to send, in
memory, per tab, cleared on reload.

A narrow, legitimate client-state idea surfaced during this discussion and was
explicitly placed **out of scope**: `useOptimistic` on the claim button, so it
flips without waiting for the round trip. No Zustand required for it either.

## Design

### The freshness contract

A cached page is served **only** while no write has happened anywhere since it
was rendered. The existing "something changed" broadcast is the invalidation
signal — it already covers every mutation, because every Server Action in
`src/app/actions/` calls both `revalidatePath("/", "layout")` and
`notifyChanged()`, `approveMember` / `rejectMember` / `removeMember` included.

Underneath that sits a 60-second ceiling, for a tab whose socket died silently
and whose deaf-poll and visibility handler both missed. It is a safety net, not
a freshness target.

### 1. Configuration

```ts
// next.config.ts
experimental: {
  useOffline: true,
  staleTimes: { dynamic: 60, static: 180 },
}
```

`dynamic: 60` is what lets a visited dynamic route's payload survive in memory,
so returning to it replays instantly with no skeleton and no server request.
`static: 180` mostly governs how long the prefetched `loading.tsx` shells stay
reusable.

This fixes repeat visits. It does **not** fix a first visit: a route never
visited is still a dynamic route with a `loading.tsx`, so Next prefetches only
the shell and the first tap still shows a skeleton. That is the follow-up's job.

### 2. The invalidation action

```ts
// src/app/actions/live.ts
"use server";

import { revalidatePath } from "next/cache";

/** Purges the calling tab's Client Cache, so no route it has visited can
 *  survive a change. Takes no input, reads nothing, writes nothing. */
export async function syncFromLive(): Promise<void> {
  revalidatePath("/", "layout");
}
```

### 3. LiveRefresh

`src/components/live-refresh.tsx` keeps everything it has — the module-level
shared client, `realtime: { worker: true }`, the 250 ms debounce, the 30 s
deaf-poll, the visibilitychange catch-up, the re-join catch-up. One line
changes: `refresh()`'s timer body calls `syncFromLive()` inside
`startTransition` (imported from `react`) instead of `router.refresh()`.

With that, `useRouter` has no remaining caller in the file and must be dropped
along with `router` from the effect's dependency array — leaving it imported
fails lint, and leaving it in the deps is misleading. The array becomes empty,
so the effect runs once per mount, which is what it already did in practice.

**Why not `router.refresh()`.** It clears the Client Cache *for the current
route only*. With caching on, a ping arriving while the viewer sits on
`/member/x` would refresh that route while the cached `/` kept its pre-change
payload for the rest of its TTL — so tapping "Všetci" would land on stale
counts, silently, with no request to correct them. `revalidatePath` purges the
whole Client Cache, and the Server Action's response re-renders the current
route in the same round trip, so the network cost per ping is unchanged: one
request either way.

Nothing about the channel changes. `LIVE_PAYLOAD` stays empty, the per-viewer
redaction still happens server-side on the re-render, and no wish data travels
over the socket.

The comment block in `live-refresh.tsx` explains `router.refresh()` at length
and must be rewritten, not merely edited around.

### 4. The CLAUDE.md exception

`syncFromLive` breaks the rule that every Server Action opens with
`getCurrentMember()`. This is deliberate and is to be recorded as a named
exception rather than left as an inconsistency for a future reader to trip over.

The rule exists because actions are reachable by direct POST and must not trust
the caller. `syncFromLive` accepts no input, reads no table and writes no row.
An anonymous POST purges *its own* cache and re-renders *its own* current
route — for a signed-out caller, `/login`. Meanwhile adding the check would
reinstate the two auth round trips this work exists to remove, on the hottest
path in the app, in every open tab, on every write.

CLAUDE.md's "Server Actions" section gains: the rule applies to every action
that touches data; `syncFromLive` is the single exception, and it is one because
it takes no input and performs no data access.

## Privacy analysis

The cache stores RSC payloads that were **already** redacted for that viewer. An
owner's own list payload cannot contain claim data — `OwnerWish` has no such
fields and `OWNER_WISH_COLUMNS` never selected them. Caching cannot create a
leak the render did not already have; it replays a decision the server made.

- **Identity change.** Sign-in is a full-page OAuth redirect: new document, empty
  cache. Sign-out calls `supabase.auth.signOut()`, and cookie deletion purges the
  Client Cache, then redirects. No payload survives a change of who is looking.
- **Access change.** `approveMember`, `rejectMember` and `removeMember` all ping,
  so a removed member's cached pages are purged in their own tab within the
  debounce. A cached page is a replay of the last authorised render, not a
  bypass — every read still re-runs `getAccess()` server-side.
- **"A tab that didn't refresh would itself be the tell."** Unchanged, and
  slightly strengthened: every tab still purges on every ping, the owner's
  included, and now purges every route rather than only the one in view.

## Failure modes

- **Offline.** `useOffline: true` holds failed Server Actions and retries them on
  reconnect, so a ping landing during a signal drop is queued rather than lost —
  better than `router.refresh()`, which simply fails. The debounce keeps that
  queue from growing per ping.
- **Silently dead socket.** Caught by the existing 30 s deaf-poll and the
  visibilitychange handler, with the 60 s TTL underneath as the last resort.
- **`notifyChanged()` itself fails.** It catches and warns. The socket is
  *healthy*, so the deaf-poll does not help. This hole pre-dates this work; the
  change makes its symptom marginally worse, from "stale until you next
  navigate" to "stale for up to 60 s". Named here deliberately; not fixed here.
- **The writing tab.** Does not depend on its own broadcast returning: the
  actions already call `revalidatePath("/", "layout")` directly.

## Testing

No unit test is written. The repo tests pure functions with no mocks and no DB;
this change is configuration plus one action plus one effect, and there is
nothing pure to pin down. Inventing a mocked test here would assert the mock.

Verification is manual, against a **production build** — automatic prefetching
and the Client Cache do not behave the same under `next dev` — with two browser
profiles:

1. `/` → `/member/x` → "Všetci": the second view shows no skeleton.
2. **The case that proves it.** A sits on `/member/c`; B claims one of C's
   wishes; A taps "Všetci" and sees correct counts. This is precisely what
   `router.refresh()` alone gets wrong.
3. **Owner's tab.** C is on their own list; B claims from it. C's tab refreshes,
   still shows nothing claim-related, and C's own card still shows a bare total.
4. **Client state survives the merge.** Open the add-wish dialog, type a title,
   have B write something. The dialog and the half-typed text must survive. This
   is currently documented as a property of `router.refresh()`, so it must be
   re-verified against the action path rather than assumed.
5. **Identity change.** Sign out, sign in as a different member in the same tab;
   nothing from the previous member renders.

Plus `npm run typecheck && npm run lint && npm test`.

## Files touched

| File | Change |
|---|---|
| `next.config.ts` | add `staleTimes` |
| `src/app/actions/live.ts` | new — `syncFromLive` |
| `src/components/live-refresh.tsx` | call the action; rewrite the comment block |
| `CLAUDE.md` | the named Server Action exception; why `router.refresh()` is insufficient |
| `README.md` | the *why* behind the client cache |

## Follow-up: server latency (not in this plan)

Once the above lands, the remaining skeleton is the first visit and the
post-ping re-render. Two moves, in a separate plan:

- **Replace `getUser()` with `getClaims()` in `getAccess`.** Verifies the JWT
  locally against the project's JWKS instead of making an HTTP call to Supabase
  Auth — the same security property, one fewer round trip, and it removes the
  duplication with the call `proxy.ts` already made on the same request.
  **Prerequisite to confirm first:** the Supabase project must be on asymmetric
  JWT signing keys, or `getClaims` falls back to the network call and buys
  nothing. `proxy.ts` keeps its `getUser()` call — that one performs the session
  refresh.
- **Parallelise `/member/[id]`.** `getAccess()` and `getMemberById(id)` do not
  depend on each other and can run under one `Promise.all`.

Four sequential hops become two.

Also parked, deliberately out of scope: `useOptimistic` on the claim button.
