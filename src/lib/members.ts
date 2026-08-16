import type { MemberSummary, MemberWithCount } from "@/lib/types";

/**
 * Pure member -> grid-card mapper. Free of any Supabase or Next.js import so
 * the surprise rule can be unit tested directly (see members.test.ts).
 */

/**
 * One card on the family grid.
 *
 * The viewer's own row comes back without an `availableCount` field at all — a
 * count of their still-free wishes sitting next to their total would say, in
 * arithmetic, that the rest have been claimed. The query that feeds this
 * excludes the viewer's own rows in its `WHERE` clause, so `free` should hold no
 * entry for them; returning the other half of the union is the second lock on
 * the same door.
 */
export function toMemberSummary(
  member: MemberWithCount,
  free: ReadonlyMap<string, number>,
  viewerId: string,
): MemberSummary {
  if (member.id === viewerId) return { ...member, viewerIsOwner: true };

  return {
    ...member,
    viewerIsOwner: false,
    availableCount: free.get(member.id) ?? 0,
  };
}
