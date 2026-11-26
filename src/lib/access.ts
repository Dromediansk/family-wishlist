import type { GroupId, MembershipId, UserId } from "@/lib/ids";
import type { GroupRef, Role, Viewer } from "@/lib/types";

/**
 * Who is looking. Every page routes off this and nothing else. Pure, with no
 * Supabase import, so it is tested for real rather than through mocks.
 *
 * `groupless` is a signed-in account with no membership anywhere — legal since
 * groups became a thing, and what /start serves.
 * docs/decisions/groups-and-invites.md
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
 * Peers are read off the members of the viewer's groups, so there are none at
 * all for an account that belongs to no group. A peers set missing its own
 * owner makes `canReadList` false for the one list the viewer certainly owns,
 * which locks a groupless account out of its own wishes — hence the seed, which
 * happens whatever the roster held.
 * docs/decisions/privacy-rule.md#reading-a-list
 */
export function seedPeers(
  ownerId: UserId,
  peerIds: readonly UserId[],
): ReadonlySet<UserId> {
  return new Set<UserId>([ownerId, ...peerIds]);
}

/** One of the viewer's own memberships, with everybody else in that group. */
export type RosterMembership = {
  membershipId: MembershipId;
  groupId: GroupId;
  groupName: string;
  role: Role;
  members: readonly { userId: UserId; name: string }[];
};

/** What `foldRoster` makes of one query: the parts a `Viewer` is built from. */
export type Roster = {
  groups: readonly GroupRef[];
  peerNames: ReadonlyMap<UserId, ReadonlyMap<GroupId, string>>;
  /** The membership `enterGroup` proves each group with. */
  membershipIds: ReadonlyMap<GroupId, MembershipId>;
};

/**
 * Fold the viewer's memberships — each carrying its group's member list — into
 * the parts of a `Viewer`. One query feeds all of it, so a page waits on one
 * trip for who is looking rather than three in a row.
 *
 * `memberships` must arrive in the viewer's join order: `groups` keeps it, and
 * `preferredName` and the switcher both depend on it.
 */
export function foldRoster(memberships: readonly RosterMembership[]): Roster {
  const groups: GroupRef[] = [];
  const membershipIds = new Map<GroupId, MembershipId>();
  const peerNames = new Map<UserId, Map<GroupId, string>>();

  for (const membership of memberships) {
    groups.push({
      id: membership.groupId,
      name: membership.groupName,
      role: membership.role,
    });
    membershipIds.set(membership.groupId, membership.membershipId);

    for (const member of membership.members) {
      let byGroup = peerNames.get(member.userId);
      if (!byGroup) {
        byGroup = new Map();
        peerNames.set(member.userId, byGroup);
      }
      byGroup.set(membership.groupId, member.name);
    }
  }

  return { groups, peerNames, membershipIds };
}
