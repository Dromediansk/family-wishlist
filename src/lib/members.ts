import type { UserId } from "@/lib/ids";
import type { MemberSummary, MemberWithCount } from "@/lib/types";

/**
 * Pure member -> grid-card mapper, free of Supabase and Next.js imports so the
 * privacy rule can be unit tested directly (members.test.ts).
 */

/**
 * One card on the family grid. The viewer's own row comes back with no
 * `availableCount` at all — the second lock on the same door as the query's
 * `.neq("owner_user_id", viewerId)`.
 * docs/content/privacy-rule.md#counting-on-the-family-grid
 *
 * Keyed off `userId`, never `id`: wishes hang off the account, while `id` is
 * this person's membership in one group.
 */
export function toMemberSummary(
  member: MemberWithCount,
  free: ReadonlyMap<UserId, number>,
  viewerId: UserId,
): MemberSummary {
  if (member.userId === viewerId) return { ...member, viewerIsOwner: true };

  return {
    ...member,
    viewerIsOwner: false,
    availableCount: free.get(member.userId) ?? 0,
  };
}

/**
 * Slovak collation: Č sorts after C, not after Z. Built once — a collator inside
 * the comparator is the classic way to make a sort slow.
 */
const byName = new Intl.Collator("sk", { sensitivity: "base" });

/**
 * Your own card first, then everyone else by name. Nothing claim-derived enters
 * this — the only keys are `viewerIsOwner` and `name`.
 *
 * Keyed off the discriminant `toMemberSummary` already set, so there is no
 * second copy of "who is looking" to drift. Sorts a copy; `sort` is stable, so
 * two members sharing a name keep sign-up order.
 */
export function sortMemberSummaries(
  summaries: readonly MemberSummary[],
): MemberSummary[] {
  return [...summaries].sort((a, b) => {
    if (a.viewerIsOwner !== b.viewerIsOwner) return a.viewerIsOwner ? -1 : 1;
    return byName.compare(a.name, b.name);
  });
}
