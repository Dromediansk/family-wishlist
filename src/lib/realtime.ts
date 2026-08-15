import "server-only";

import { LIVE_EVENT, LIVE_PAYLOAD, LIVE_TOPIC } from "@/lib/live";
import { getSupabase } from "@/lib/supabase";

/**
 * Live updates, without ever telling a browser what changed.
 *
 * The app's one rule is that you never learn something on your own list has
 * been claimed. That rule is enforced per viewer, server-side, by the column
 * lists in `getWishListFor` — so no wish row may ever be pushed to a browser.
 * Supabase Realtime's `postgres_changes` is therefore unusable here: it would
 * need an RLS select policy on `wishes`, which would hand owners their own
 * `claimed_by` values.
 *
 * Instead we broadcast a content-free ping. Clients react by re-rendering
 * through the server, which re-applies the redaction for whoever is looking.
 */
export async function notifyChanged(): Promise<void> {
  try {
    const channel = getSupabase().channel(LIVE_TOPIC);

    // `httpSend` POSTs to the broadcast endpoint instead of opening a socket,
    // which is what a serverless Server Action needs. (`send()` still falls
    // back to REST, but warns that the fallback is going away.)
    await channel.httpSend(LIVE_EVENT, LIVE_PAYLOAD);
  } catch (error) {
    // A dropped ping is cosmetic — the other tabs catch up on focus or on the
    // fallback poll. Never fail a write that already succeeded because of it.
    //
    // But do say so. `httpSend` needs Realtime server >= v2.97.0 and rejects
    // outright on anything older, and a paused free project takes Realtime down
    // with it. Both fail every single time, and the only visible symptom is
    // that updates feel a minute late — which is exactly what a working
    // fallback poll looks like. Swallowing this silently would make a
    // permanently broken feature indistinguishable from a healthy one.
    console.warn("Live update ping failed:", error);
  }
}
