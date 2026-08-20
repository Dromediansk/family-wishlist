import type { Viewer } from "@/lib/types";

export { isGroupAdmin } from "@/lib/visibility";

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
