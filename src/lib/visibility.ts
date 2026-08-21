import type { GroupId, MembershipId, UserId } from "@/lib/ids";
import type { ClaimView, GroupRef, Role } from "@/lib/types";

/**
 * The tenancy rules, as pure functions. No Supabase and no Next.js imports, so
 * they are tested for real rather than through mocks — the same reason
 * `access.ts` and `members.ts` are shaped this way.
 *
 * docs/content/privacy-rule.md#where-the-rule-is-enforced
 */

/**
 * May the viewer read this person's list at all? True for themselves, true for
 * anyone they share a group with, false for everybody else.
 *
 * This is the guard the photo route never had.
 */
export function canReadList(
  peers: ReadonlySet<UserId>,
  ownerId: UserId,
): boolean {
  return peers.has(ownerId);
}

/**
 * Is this wish, right now, tagged with a group the viewer AND the owner both
 * belong to? The read-side counterpart to check_claim_peer, and for the same
 * reason it needs all three sets: nothing prunes `wish_groups` when its owner
 * leaves the group behind, so a tag the viewer still reaches is not enough on
 * its own — the owner has to still be standing in that same group too, or the
 * tag is stale and must not outlive the membership that justified it.
 */
export function wishVisibleTo(
  wishGroupIds: ReadonlySet<GroupId>,
  viewerGroupIds: ReadonlySet<GroupId>,
  ownerGroupIds: ReadonlySet<GroupId>,
): boolean {
  for (const id of viewerGroupIds) {
    if (wishGroupIds.has(id) && ownerGroupIds.has(id)) return true;
  }
  return false;
}

/**
 * May the viewer be told *who* reserved something? Only when they share a group
 * with that person — otherwise a claim made in one group would name a stranger
 * to another, along with the fact that the two are in a group together.
 */
export function revealClaimer(
  peers: ReadonlySet<UserId>,
  claimerId: UserId,
): boolean {
  return peers.has(claimerId);
}

/**
 * Is this wish held by somebody who is not the viewer? True whether or not the
 * viewer is told *who* holds it — a claim from a group they are not in still
 * counts, which is what stops a taken wish looking free.
 *
 * One spelling for both the row that dims and the button that stands down; two
 * would let a row dim with "Toto nekupujem" still on it.
 */
export function claimedByOther(claim: ClaimView, viewerId: UserId): boolean {
  if (claim.kind === "free") return false;
  return claim.kind === "taken" || claim.by.id !== viewerId;
}

/**
 * Which of somebody's per-group names to show. The current group's if there is
 * one, otherwise the one from whichever shared group *the viewer* joined first.
 *
 * Keyed off the viewer rather than the person being named so that one screen is
 * self-consistent: every name on /buying is read through the same group.
 *
 * "?" matches the fallback `toClaimedWish` has always used for a missing name.
 */
export function preferredName(
  namesByGroup: ReadonlyMap<GroupId, string>,
  viewerGroups: readonly GroupRef[],
  currentGroupId?: GroupId,
): string {
  if (currentGroupId) {
    const here = namesByGroup.get(currentGroupId);
    if (here) return here;
  }

  for (const group of viewerGroups) {
    const name = namesByGroup.get(group.id);
    if (name) return name;
  }

  return "?";
}

/**
 * One spelling of the admin check, now per group. Takes the role rather than a
 * whole context so the header, the page and the actions all share it.
 */
export function isGroupAdmin(context: { role: Role }): boolean {
  return context.role === "admin";
}

/**
 * A group admin may revoke any invite to their group; anybody may revoke one
 * they created themselves. Nobody should be unable to undo their own action.
 *
 * The group check comes first and applies to admins too — an admin of one group
 * is nobody in another.
 */
export function canRevokeInvite(
  context: { groupId: GroupId; membershipId: MembershipId; role: Role },
  invite: { groupId: GroupId; createdBy: MembershipId },
): boolean {
  if (context.groupId !== invite.groupId) return false;
  return isGroupAdmin(context) || context.membershipId === invite.createdBy;
}
