import type { GroupId } from "@/lib/ids";

/**
 * How many groups one account may bring into existence. Counted on
 * `groups.created_by`, so leaving a group does not give the budget back.
 *
 * Insurance against an abuse vector the invite-only plan does not have yet,
 * which is why it is a constant rather than a setting.
 * docs/content/groups.md#the-creation-cap
 */
export const MAX_GROUPS_PER_ACCOUNT = 5;

/**
 * Which of the viewer's groups a path is inside, or null — which is the honest
 * answer on the account-level screens (`/buying`, `/received`, `/start`), where
 * no one group is current.
 *
 * The path is matched against the viewer's own groups rather than parsed, so an
 * id they are not a member of marks nothing and names nothing.
 */
export function groupInPath<Group extends { id: GroupId }>(
  pathname: string,
  groups: readonly Group[],
): Group | null {
  for (const group of groups) {
    const base = `/g/${group.id}`;
    if (pathname === base || pathname.startsWith(`${base}/`)) return group;
  }
  return null;
}
