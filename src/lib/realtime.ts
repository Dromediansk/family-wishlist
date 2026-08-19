import "server-only";

import { LIVE_EVENT, LIVE_PAYLOAD, LIVE_TOPIC } from "@/lib/live";
import { getSupabase } from "@/lib/supabase";

/**
 * Broadcasts the content-free "something changed" ping. No wish row may ever be
 * pushed to a browser, which is why `postgres_changes` is unusable here.
 * docs/content/live-updates.md
 */
export async function notifyChanged(): Promise<void> {
  try {
    const channel = getSupabase().channel(LIVE_TOPIC);

    // POSTs to the broadcast endpoint instead of opening a socket, which is
    // what a serverless Server Action needs.
    await channel.httpSend(LIVE_EVENT, LIVE_PAYLOAD);
  } catch (error) {
    // Cosmetic — other tabs catch up on focus or on the fallback poll — so
    // never fail a write that already succeeded. Logged rather than swallowed:
    // a permanently broken ping is indistinguishable from a healthy one
    // otherwise. docs/content/live-updates.md#keeping-the-socket-alive
    console.warn("Live update ping failed:", error);
  }
}
