import type { GroupId, UserId } from "@/lib/ids";
import type { ActivityItem, GroupRef } from "@/lib/types";
import { liveWishGroups, revealClaimer, wishGroupTags } from "@/lib/visibility";

/**
 * The pure half of the activity feed: the window, the merge, and the two
 * mappers that decide what a reader is told. Free of Supabase and Next.js
 * imports so the privacy rule can be unit tested directly (activity.test.ts) —
 * the same shape as `wishes.ts` beside `data/wishes.ts`.
 *
 * docs/superpowers/specs/2026-09-16-activity-feed-design.md
 */

/** How far back the feed looks, whatever the reader's last visit was. */
export const ACTIVITY_WINDOW_DAYS = 30;

/** The most rows the dropdown ever holds, so the badge cannot exceed it either. */
export const ACTIVITY_LIMIT = 20;

/** Columns each wish read selects. Spelled here so the two queries cannot drift. */
export const ACTIVITY_COLUMNS = {
  added: "id, title, owner_user_id, created_at",
  /**
   * PRIVACY-RULE: selects `claimed_by_user_id`, which is legal here only
   * because every caller pairs it with `.neq("owner_user_id", viewer)` and
   * `toClaimActivity` refuses the row a second time. Removing either makes this
   * an owner-serving path. docs/decisions/privacy-rule.md
   */
  claimed: "id, title, owner_user_id, claimed_by_user_id, claimed_at",
} as const;

export type AddedActivityRow = {
  id: string;
  title: string;
  owner_user_id: UserId;
  created_at: string;
};

export type ClaimActivityRow = {
  id: string;
  title: string;
  owner_user_id: UserId;
  claimed_by_user_id: UserId | null;
  claimed_at: string | null;
};

const MS_PER_DAY = 86_400_000;

/** The oldest moment the feed reports, as an ISO string a query can compare. */
export function activityWindowStart(now: Date): string {
  return new Date(now.getTime() - ACTIVITY_WINDOW_DAYS * MS_PER_DAY).toISOString();
}

/**
 * Which group a wish's row is labelled with, or null when it reaches none the
 * reader may be shown.
 *
 * Two narrowings, both existing: `liveWishGroups` drops a tag naming a group
 * the owner has since left — nothing prunes `wish_groups` when a membership
 * goes — and `wishGroupTags` keeps only the viewer's own, in the viewer's own
 * order, which is the order the switcher and `preferredName` already use.
 */
export function labelGroup(
  wishGroupIds: readonly GroupId[],
  ownerGroupIds: ReadonlySet<GroupId>,
  viewerGroups: readonly GroupRef[],
): GroupRef | null {
  const live = liveWishGroups([...wishGroupIds], ownerGroupIds);
  return wishGroupTags(live, viewerGroups)[0] ?? null;
}

export function toAddedActivity(
  row: AddedActivityRow,
  names: ReadonlyMap<UserId, string>,
  group: GroupRef,
): ActivityItem {
  return {
    kind: "wish-added",
    at: row.created_at,
    wishId: row.id,
    title: row.title,
    owner: { id: row.owner_user_id, name: names.get(row.owner_user_id) ?? "?" },
    group,
  };
}

/**
 * PRIVACY-RULE: a claim on the viewer's own wish never becomes an item.
 *
 * The second of the two filters that hold the one rule here. The first is the
 * `.neq("owner_user_id", …)` in the query; this one repeats it in the tested
 * half, so a query later rewritten without it still cannot leak. The claimer's
 * name is narrowed by `revealClaimer`, exactly as `toViewerWish` narrows it.
 * docs/decisions/privacy-rule.md
 */
export function toClaimActivity(
  row: ClaimActivityRow,
  viewerId: UserId,
  peers: ReadonlySet<UserId>,
  names: ReadonlyMap<UserId, string>,
  group: GroupRef,
): ActivityItem | null {
  if (row.owner_user_id === viewerId) return null;

  const claimer = row.claimed_by_user_id;
  // claim_consistent guarantees both or neither; a released claim has neither
  // and has nothing left to report.
  if (claimer === null || row.claimed_at === null) return null;

  // Your own reservation is not news to you.
  if (claimer === viewerId) return null;

  return {
    kind: "wish-claimed",
    at: row.claimed_at,
    wishId: row.id,
    title: row.title,
    owner: { id: row.owner_user_id, name: names.get(row.owner_user_id) ?? "?" },
    group,
    claimer: revealClaimer(peers, claimer)
      ? { id: claimer, name: names.get(claimer) ?? "?" }
      : null,
  };
}

/**
 * Every source folded into one list, newest first, capped.
 *
 * Takes the nulls the mappers hand back rather than making four callers filter
 * them, and sorts on parsed timestamps rather than on the strings: the four
 * columns come from four tables, and lexical order across them is a coincidence
 * rather than a guarantee.
 */
export function mergeActivity(
  sources: readonly (readonly (ActivityItem | null)[])[],
): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const source of sources) {
    for (const item of source) if (item) items.push(item);
  }

  return items
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, ACTIVITY_LIMIT);
}

/**
 * How many of these the reader has not seen. Null means they never looked, so
 * everything counts — a new account opens the bell to the window, not to
 * nothing.
 */
export function countUnseen(
  items: readonly ActivityItem[],
  seenAt: string | null,
): number {
  if (seenAt === null) return items.length;
  const seen = Date.parse(seenAt);
  return items.filter((item) => Date.parse(item.at) > seen).length;
}

/**
 * A stable React key. The kind is part of it because one wish yields both an
 * "added" and a "claimed" row, and the timestamp because a member can rejoin a
 * group they once left.
 */
export function activityKey(item: ActivityItem): string {
  switch (item.kind) {
    case "wish-added":
    case "wish-claimed":
      return `${item.kind}:${item.wishId}:${item.at}`;
    case "wish-fulfilled":
      return `${item.kind}:${item.id}`;
    case "member-joined":
      return `${item.kind}:${item.member.id}:${item.group.id}:${item.at}`;
  }
}
