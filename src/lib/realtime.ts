import "server-only";

import { groupIdsOf } from "@/lib/data/members";
import type { GroupId, UserId } from "@/lib/ids";
import { channelFor, LIVE_EVENT, LIVE_PAYLOAD } from "@/lib/live";
import { getSupabase } from "@/lib/supabase";

/**
 * Broadcasts the content-free "something changed" ping to every group the
 * change is visible in. No wish row may ever be pushed to a browser, which is
 * why `postgres_changes` is unusable here.
 * docs/content/live-updates.md
 */
export async function notifyChanged(groupIds: readonly GroupId[]): Promise<void> {
  try {
    const supabase = getSupabase();

    // POSTs to the broadcast endpoint instead of opening a socket, which is
    // what a serverless Server Action needs.
    await Promise.all(
      groupIds.map((groupId) =>
        supabase.channel(channelFor(groupId)).httpSend(LIVE_EVENT, LIVE_PAYLOAD),
      ),
    );
  } catch (error) {
    // Cosmetic — other tabs catch up on focus or on the fallback poll — so
    // never fail a write that already succeeded. Logged rather than swallowed:
    // a permanently broken ping is indistinguishable from a healthy one
    // otherwise. docs/content/live-updates.md#keeping-the-socket-alive
    console.warn("Live update ping failed:", error);
  }
}

/**
 * Ping every group the affected owner belongs to. The owner is who all
 * interested viewers have in common — a claim made in one group has to reach
 * the owner's other groups, whose members share nothing with the claimer.
 *
 * Cosmetic like the ping itself: the lookup lives inside the same catch, so a
 * failed read costs a refresh rather than the write that already succeeded.
 */
export async function notifyOwnerChanged(ownerId: UserId): Promise<void> {
  try {
    const groupIds = await groupIdsOf(ownerId);
    const supabase = getSupabase();

    await Promise.all(
      groupIds.map((groupId) =>
        supabase.channel(channelFor(groupId)).httpSend(LIVE_EVENT, LIVE_PAYLOAD),
      ),
    );
  } catch (error) {
    console.warn("Live update ping failed:", error);
  }
}
