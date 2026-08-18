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
