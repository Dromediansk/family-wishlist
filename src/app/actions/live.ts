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
 * and learns nothing — there is nothing here to authorize, which is the whole
 * reason for the exception. It does not rest on cost: `proxy.ts` already runs
 * `getUser()` on this same POST and the re-render that follows pays
 * `getAccess()` anyway, so deriving the caller here would add one duplicate
 * auth call and one small `family_members` select, not "two round trips", and
 * this is a family app with single-digit open tabs, not "the hottest path in
 * the app".
 *
 * It stays safe only as long as nothing is cached server-side. `revalidatePath`
 * is a cache-*mutating* primitive; today it's a no-op because of
 * `force-dynamic` and no `use cache` anywhere in the app. The day this app
 * adopts Cache Components, an unauthenticated call here becomes an
 * unauthenticated, repeatable, global cache purge, and the caller check goes
 * back in.
 */
export async function syncFromLive(): Promise<void> {
  revalidatePath("/", "layout");
}
