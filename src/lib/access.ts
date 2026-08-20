import type { UserId } from "@/lib/ids";
import type { Viewer } from "@/lib/types";

/**
 * Who is looking. Every page routes off this and nothing else. Pure, with no
 * Supabase import, so it is tested for real rather than through mocks.
 *
 * `groupless` is a signed-in account with no membership anywhere — legal since
 * groups became a thing, and what /start serves.
 * docs/content/groups.md
 */
export type Access =
  | { kind: "anonymous" }
  | { kind: "groupless"; viewer: Viewer }
  | { kind: "member"; viewer: Viewer };

export function resolveAccess(input: {
  authUserId: string | null;
  viewer: Viewer | null;
}): Access {
  if (!input.authUserId) return { kind: "anonymous" };

  // Signed in with no app_users row — only possible if it was deleted under a
  // live session. Treated as signed out.
  if (!input.viewer) return { kind: "anonymous" };

  return input.viewer.groups.length === 0
    ? { kind: "groupless", viewer: input.viewer }
    : { kind: "member", viewer: input.viewer };
}

/**
 * Everyone a viewer may see, seeded with the viewer themselves.
 *
 * `peer_user_ids` derives self-membership from a join, so it hands back nothing
 * at all for an account that belongs to no group. A peers set missing its own
 * owner makes `canReadList` false for the one list the viewer certainly owns,
 * which locks a groupless account out of its own wishes — hence the seed, which
 * happens whatever the query returned.
 * docs/content/privacy-rule.md#reading-a-list
 */
export function seedPeers(
  ownerId: UserId,
  peerIds: readonly UserId[],
): ReadonlySet<UserId> {
  return new Set<UserId>([ownerId, ...peerIds]);
}
