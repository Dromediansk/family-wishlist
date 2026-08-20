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
 * The group segment of a path, as it was typed, or null when the path is not
 * under `/g/`. A bare id and nothing more: it has proved nothing yet.
 */
export function groupIdFromPath(pathname: string): string | null {
  const segments = pathname.split("/");
  // ["", "g", id, …] — an id is required, anything after it is not.
  if (segments[1] !== "g") return null;
  return segments[2] || null;
}

/**
 * Which of the viewer's groups a path is inside, or null — which is the honest
 * answer on the account-level screens (`/buying`, `/received`, `/start`), where
 * no one group is current.
 *
 * The segment is matched against the viewer's own groups, so an id they are not
 * a member of marks nothing and names nothing.
 */
export function groupInPath<Group extends { id: GroupId }>(
  pathname: string,
  groups: readonly Group[],
): Group | null {
  const id = groupIdFromPath(pathname);
  if (id === null) return null;
  return groups.find((group) => group.id === id) ?? null;
}
