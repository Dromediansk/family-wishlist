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

/**
 * Slovak collation: Č sorts right after C, not after Z. A plain `<` compares
 * code points and would file Čaňo past Zuzka. Built once — constructing a
 * collator inside the comparator is the classic way to make a sort slow.
 */
const byName = new Intl.Collator("sk", { sensitivity: "base" });

/**
 * The order of the family grid: your own card first, then everyone else by name.
 *
 * Your own card leads because it is the one you came for — it is where you add
 * to your own list. Nothing claim-derived enters this: the only keys are
 * `viewerIsOwner` and `name`, and you already knew which card was yours.
 *
 * Keyed off the discriminant `toMemberSummary` has already set rather than
 * taking a viewer id of its own, so there is no second copy of "who is looking"
 * to drift out of step. Sorts a copy, and `Array.prototype.sort` is stable, so
 * two members sharing a name keep the sign-up order the query gave them.
 */
export function sortMemberSummaries(
  summaries: readonly MemberSummary[],
): MemberSummary[] {
  return [...summaries].sort((a, b) => {
    if (a.viewerIsOwner !== b.viewerIsOwner) return a.viewerIsOwner ? -1 : 1;
    return byName.compare(a.name, b.name);
  });
}
