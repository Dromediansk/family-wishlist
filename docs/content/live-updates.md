# Live updates

Changes show up in everyone else's open tab within about a second, without a
refresh. The interesting part is what is **not** sent.

## The ping carries nothing

`postgres_changes` — Supabase's usual answer, streaming row changes to the
browser — is unusable here. It is filtered by row level security, so switching
it on means granting the browser read access to `wishes`, and every list owner
would receive their own `claimed_by` values. See
[The privacy rule](privacy-rule.md).

So the server broadcasts an **empty message**. It says "something changed" and
nothing else: not what changed, not whose list, not who did it. Even a bare
member id would be enough for an owner to infer a claim from devtools.

`LIVE_PAYLOAD` in [`src/lib/live.ts`](../../src/lib/live.ts) is `{}`, and
[`src/lib/live.test.ts`](../../src/lib/live.test.ts) pins that down.

## How a tab answers it

Every open tab calls `syncFromLive`
([`src/app/actions/live.ts`](../../src/app/actions/live.ts)), a Server Action
that throws away everything that tab has cached and re-renders the current route
under that tab's own cookie. The redaction is re-applied where it always was, in
`getWishListFor`, so **no wish data ever travels over the socket**.

It must be `revalidatePath("/", "layout")`, not `router.refresh()`:
`router.refresh()` clears the Client Cache for the current route only, so a
family grid the viewer had tapped away from would keep its pre-change counts and
be replayed from memory. `refresh()` from `next/cache` is wrong for a related
reason — it marks the response dynamic-only, and the client reducer skips
`invalidateEntirePrefetchCache` for that kind, so a cached `/` payload would
survive the ping.

The response is merged into the running tree rather than replacing it, so an
open dialog and its half-typed input survive an update landing.

### syncFromLive is the one unauthorized action

It takes no input, reads no table and writes no row, so there is nothing to
authorize. An anonymous POST re-renders the poster's own route and learns
nothing.

The usual caller check could not apply anyway: `getCurrentMember()` returns only
*approved* members, so gating the ping on it would leave a `pending` tab deaf to
the very ping that tells it it has been approved.

**This stays safe only while nothing is cached server-side.** `revalidatePath` is
a cache-*mutating* primitive, today a no-op because of `force-dynamic` and no
`use cache` anywhere. The day this app adopts Cache Components, an
unauthenticated call becomes a repeatable global cache purge and the caller check
goes back in.

## Why the owner's tab refreshes too

Nothing on the owner's page can visibly change, so refreshing it looks like
waste. It is not. A ping that skipped them would itself be the leak: an owner who
noticed they *didn't* get one would know why.

Every tab refreshing on every change, with nothing in the message, is what makes
a claim indistinguishable from someone adding a wish.

The ping also does a job it was not designed for: when an admin approves someone,
it reaches that person's waiting screen and the page turns into the app by
itself.

## Keeping the socket alive

- **One Supabase client for the life of the page**, not one per effect run.
  Creating it inside the effect made a fresh client with its own WebSocket every
  time the effect re-ran — and `removeChannel` only unsubscribes the channel — so
  sockets accumulated across React's double-invoked effects and hot reloads.
- **The heartbeat runs in a web worker** (`realtime: { worker: true }`).
  Browsers throttle timers in background tabs hard enough to starve it, and
  background tabs are the normal case for this app.
- **Bursts are debounced** to 250 ms, so a run of writes costs one re-render.
- **While the socket is down**, the tab catches up on visibility change and on a
  30-second poll. Neither fires while the channel is subscribed — refreshing on
  every tab switch would double the work for a single change.
- **At most one sync is outstanding.** A ping arriving while one is in flight is
  dropped, not queued; the next ping, poll tick or visibility change picks it up.
- **Re-joining after a drop triggers a catch-up**, but the first join does not —
  the page was just server-rendered.

Ping failures are logged rather than swallowed. `httpSend` needs Realtime server
≥ v2.97.0 and a paused free project takes Realtime down with it; both fail every
time, and the only visible symptom is updates feeling a minute late — which is
exactly what a working fallback poll looks like.

A dropped ping never fails the write that already succeeded.

## The public channel

Anyone holding the anon key can join the channel and send on it. That buys them
two things: watching an empty message go past, and making open tabs re-render.
Neither reveals anything.

Closing the second would mean a private channel — a receive-only policy, plus
`config: { private: true }` on both sides:

```sql
create policy "anon receives wishlist signal"
  on realtime.messages for select to anon
  using (realtime.topic() = 'family-wishlist' and extension = 'broadcast');
```

It is **not enabled**. Private broadcasts persist into the day-partitioned
`realtime.messages` table, so on a project whose partition-creating job is not
running every send fails with "Missing messages partition" and live updates
silently stop. For a family wish list that failure mode costs more than the
nuisance it prevents.

## Why going back doesn't reload

Tapping a member and then tapping *Všetci* to return used to show a loading
skeleton both ways. That is a `<Link>` navigation, and Next keeps such a page in
memory only for as long as `experimental.staleTimes.dynamic` allows — 0 by
default for dynamic routes, so every page reached by a link was re-fetched the
moment you tapped back to it. It is set to **60 seconds** in `next.config.ts`.

The browser's own Back/Forward buttons were never subject to that default. Next
replays those regardless of `staleTimes`, bounded by invalidation alone. Which
means the grid could already go stale before any of this: sit on `/`, open a
member's list, have someone claim one of their wishes, press Back — the grid
replayed with pre-claim counts.

Both are honest because every write pings and every ping purges the whole cache.
So the 60 seconds bounds the `<Link>` case alone, and a Back/Forward replay is
bounded by the ping. That leaves exactly one scenario: a tab whose socket
believes it is still subscribed but has gone silent, where a Back navigation can
replay a page that is arbitrarily old.

Nothing new is stored by doing this. The cache holds the same per-viewer pages
the server had already decided to send — in memory, per tab, gone on reload — and
an owner's own page has no claim data in it to cache in the first place.

## The moving parts

| File | Role |
|---|---|
| [`src/lib/live.ts`](../../src/lib/live.ts) | Channel name and the empty payload, shared by both sides |
| [`src/lib/realtime.ts`](../../src/lib/realtime.ts) | The server publisher, called by every Server Action |
| [`src/app/actions/live.ts`](../../src/app/actions/live.ts) | `syncFromLive` |
| [`src/components/live-refresh.tsx`](../../src/components/live-refresh.tsx) | The browser subscriber, mounted once in the root layout |
| `supabase/migrations/0002_realtime.sql` | No DDL — the reasoning, next to the schema |

Live updates work on serverless hosts: the browser holds its socket open to
Supabase rather than to the Next.js server, and the server publishes with a
single HTTP request (`httpSend`). Nothing needs a long-running process.
