"use server";

import { revalidatePath } from "next/cache";

/**
 * Throws away everything the calling tab has cached — the browser's answer to
 * the live ping.
 *
 * `revalidatePath` purges the *caller's own* Client Cache, every route that tab
 * has visited rather than only the one on screen, and the action's response
 * re-renders the current route under the caller's cookie, so `getWishListFor`
 * redacts for this viewer exactly as it does on a first visit.
 *
 * Not `refresh()` from `next/cache`, which looks like the tighter primitive: it
 * marks the response dynamic-only, and the client reducer skips
 * `invalidateEntirePrefetchCache` for that kind, so a cached `/` payload would
 * survive the ping — the exact staleness this exists to clear.
 *
 * This is the one Server Action that skips the checklist in CLAUDE.md: no
 * input, no table read, no row written, so an anonymous POST re-renders the
 * poster's own route and learns nothing. Step 1 in particular cannot apply —
 * `getCurrentMember()` returns only *approved* members, so gating the ping on
 * it would leave a `pending` tab deaf to the very ping that tells it it was
 * approved (`src/app/pending/page.tsx`).
 *
 * It stays safe only as long as nothing is cached server-side.
 * `revalidatePath` is a cache-*mutating* primitive; today it's a no-op because
 * of `force-dynamic` and no `use cache` anywhere. The day this app adopts Cache
 * Components, an unauthenticated call here becomes a repeatable, global cache
 * purge, and the caller check goes back in.
 */
export async function syncFromLive(): Promise<void> {
  revalidatePath("/", "layout");
}
