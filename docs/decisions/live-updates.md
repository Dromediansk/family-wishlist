# Live updates

Changes show up in everyone else's open tab within about a second, without a
refresh. The interesting part is what is **not** sent.

## The ping carries nothing

`postgres_changes` — Supabase's usual answer — is unusable here. It is filtered
by row level security, so switching it on means granting the browser read access
to `wishes`, and every list owner would receive their own `claimed_by_user_id`
values.

So the server broadcasts an **empty message**. It says "something changed" and
nothing else: not what changed, not whose list, not who did it. Even a bare user
id would be enough for an owner to infer a claim from devtools. `LIVE_PAYLOAD`
is `{}`, and a test pins that down.

## One channel per group

A broadcast reaches every subscriber at once, so a single global topic would
send every group's ping to every browser. `channelFor(groupId)` names one
channel per group, and a tab subscribes to every group its viewer belongs to. A
partial drop counts as deaf: the fallback poll runs unless *every* channel is
subscribed.

| Change | Pings | Because |
|---|---|---|
| a wish, a claim, a hand-over | every group the **owner** is in | the owner is the one person every interested viewer has in common — a claim made in one group has to reach the owner's other groups, whose members share nothing with the claimer |
| a member, an invite, a group | that one group | nobody outside it can see the difference |

A **deleted** group is pinged after its row has gone, which works because the
channel is named from the id rather than from anything that has to still exist.

The owner-groups lookup stays *inside* the same `try` as the send, because a
read that fails must not fail a write that already succeeded.

## How a tab answers it

Every tab calls `syncFromLive`, a Server Action that throws away everything that
tab has cached and re-renders the current route under that tab's own cookie. The
redaction is re-applied where it always was, so **no wish data ever travels over
the socket**.

It must be `revalidatePath("/", "layout")`, not `router.refresh()`:
`router.refresh()` clears the Client Cache for the current route only, so a
family grid the viewer had tapped away from would keep its pre-change counts and
be replayed from memory. `refresh()` from `next/cache` is wrong for a related
reason — it marks the response dynamic-only, and the client reducer skips
`invalidateEntirePrefetchCache` for that kind.

The response is merged into the running tree rather than replacing it, so an
open dialog and its half-typed input survive an update landing.

### syncFromLive is the one unauthorized action

It takes no input, reads no table and writes no row, so there is nothing to
authorize and nothing for a caller check to protect. An anonymous POST
re-renders the poster's own route, under the poster's own cookie, and learns
nothing.

**This stays safe only while nothing is cached server-side.** `revalidatePath`
is a cache-*mutating* primitive, today a no-op because of `force-dynamic` and no
`use cache` anywhere. The day this app adopts Cache Components, an
unauthenticated call becomes a repeatable global cache purge and the caller
check goes back in.

## Why the owner's tab refreshes too

Nothing on the owner's page can visibly change, so refreshing it looks like
waste. It is not. **A ping that skipped them would itself be the leak**: an
owner who noticed they *didn't* get one would know why.

Every tab refreshing on every change, with nothing in the message, is what makes
a claim indistinguishable from someone adding a wish.

## Keeping the socket alive

- **One Supabase client for the life of the page**, not one per effect run.
  Creating it inside the effect made a fresh client with its own WebSocket every
  time, and `removeChannel` only unsubscribes the channel — so sockets
  accumulated across React's double-invoked effects and hot reloads.
- **The heartbeat runs in a web worker** (`realtime: { worker: true }`).
  Browsers throttle timers in background tabs hard enough to starve it, and
  background tabs are the normal case for this app.
- **Bursts are debounced** to 250 ms.
- **While the socket is down**, the tab catches up on visibility change and on a
  30-second poll. Neither fires while every channel is subscribed.
- **At most one sync is outstanding.** A ping arriving while one is in flight is
  dropped, not queued.
- **Re-joining after a drop triggers a catch-up**, but the first join does not —
  the page was just server-rendered.

Ping failures are logged rather than swallowed. `httpSend` needs Realtime server
≥ v2.97.0 and a paused free project takes Realtime down with it; both fail every
time, and the only visible symptom is updates feeling a minute late — which is
exactly what a working fallback poll looks like. A dropped ping never fails the
write that already succeeded.

## The public channel

Anyone holding the anon key can join a channel and send on it, given a group id.
That buys them two things: watching an empty message go past, and making that
group's tabs re-render. Neither reveals anything, which is why the group id in
the topic costs nothing.

Closing the second would mean a private channel — a receive-only policy plus
`config: { private: true }` on both sides. It is **not enabled**: private
broadcasts persist into the day-partitioned `realtime.messages` table, so on a
project whose partition-creating job is not running every send fails with
"Missing messages partition" and live updates silently stop. For a family wish
list that failure mode costs more than the nuisance it prevents.

Matching a topic prefix is all such a policy could do anyway: it cannot know
which groups the session belongs to without reading `memberships`, which no
policy may do.

## Why going back doesn't reload

A `<Link>` navigation keeps a page in memory only as long as
`experimental.staleTimes.dynamic` allows — 0 by default for dynamic routes, so
every page reached by a link was re-fetched the moment you tapped back to it. It
is set to **60 seconds**.

The browser's own Back/Forward buttons were never subject to that default; Next
replays those regardless, bounded by invalidation alone.

Both are honest because every write pings and every ping purges the whole cache.
So the 60 seconds bounds the `<Link>` case alone, and a Back/Forward replay is
bounded by the ping. That leaves exactly one scenario: a tab whose socket
believes it is still subscribed but has gone silent, where a Back navigation can
replay a page that is arbitrarily old.

Nothing new is stored by doing this. The cache holds the same per-viewer pages
the server had already decided to send — in memory, per tab, gone on reload —
and an owner's own page has no claim data in it to cache in the first place.

## Hosting

Live updates work on serverless hosts: the browser holds its socket open to
Supabase rather than to the Next.js server, and the server publishes with a
single HTTP request. Nothing needs a long-running process.
