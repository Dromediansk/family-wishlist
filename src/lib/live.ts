/**
 * The shared vocabulary of the live-update channel, imported by both the server
 * publisher (`src/lib/realtime.ts`) and the browser subscriber
 * (`src/components/live-refresh.tsx`) so the two cannot drift apart. Free of
 * `server-only` and Supabase imports so both sides — and the tests — can pull
 * it in.
 *
 * docs/content/live-updates.md
 */

import type { GroupId } from "@/lib/ids";

export const LIVE_TOPIC = "family-wishlist";
export const LIVE_EVENT = "changed";

/**
 * What a ping carries: nothing, ever. A broadcast reaches every open tab at
 * once, including the owner's, so anything describing *what* changed is
 * readable from their devtools.
 * docs/content/live-updates.md#the-ping-carries-nothing
 */
export const LIVE_PAYLOAD: Record<string, never> = {};

/**
 * One channel per group. A broadcast reaches every subscriber at once, so a
 * single global topic would have sent every family's ping to every browser.
 * The payload is still empty, and always will be.
 * docs/content/live-updates.md
 */
export function channelFor(groupId: GroupId): string {
  return `${LIVE_TOPIC}:${groupId}`;
}
