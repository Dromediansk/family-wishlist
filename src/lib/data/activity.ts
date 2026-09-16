import "server-only";

import { cache } from "react";

import {
  ACTIVITY_COLUMNS,
  ACTIVITY_LIMIT,
  activityWindowStart,
  countUnseen,
  labelGroup,
  mergeActivity,
  toAddedActivity,
  toClaimActivity,
  type AddedActivityRow,
  type ClaimActivityRow,
} from "@/lib/activity";
import { getPeerGroups, getPeerNames } from "@/lib/data/members";
import { asGroupId, asUserId, type GroupId, type UserId } from "@/lib/ids";
import { getSupabase } from "@/lib/supabase";
import type { ActivityItem, Viewer } from "@/lib/types";
import {
  WISH_GROUPS_SCOPE,
  embeddedGroupIds,
  type WishGroupsEmbed,
} from "@/lib/wishes";

/**
 * The activity feed: four reads over rows that already exist, merged per
 * viewer. Nothing is written when something happens, so there is no event table
 * here and no fan-out — the redaction is applied at read time, by the same pure
 * functions every other read uses.
 *
 * docs/superpowers/specs/2026-09-16-activity-feed-design.md
 */

export type ActivityFeed = {
  items: ActivityItem[];
  unseen: number;
};

const EMPTY: ActivityFeed = { items: [], unseen: 0 };

/** Everyone the viewer can see, themselves excluded — nobody's own news. */
function othersVisibleTo(viewer: Viewer): string[] {
  return [...viewer.peers].filter((id) => id !== viewer.userId);
}

/**
 * When this account last opened the bell, or null if never.
 *
 * Its own read rather than a column on `getViewer`: the viewer is built on
 * every request by every page, and only the header wants this.
 */
async function lastSeenAt(viewer: Viewer): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("app_users")
    .select("activity_seen_at")
    .eq("id", viewer.userId)
    .maybeSingle();

  if (error) throw error;
  return (data as { activity_seen_at: string | null } | null)?.activity_seen_at ?? null;
}

/**
 * Wishes added to a list the viewer can read.
 *
 * Scoped four ways: to people the viewer shares a group with, away from the
 * viewer's own list, to a wish tagged for one of the viewer's own groups —
 * `WISH_GROUPS_SCOPE`'s `!inner` join narrows the embed itself, not just which
 * rows come back, so `ACTIVITY_LIMIT` is spent on rows the viewer could see in
 * the first place rather than on ones `labelGroup` would go on to discard —
 * and, in `labelGroup`, to a tag naming a group the owner still stands in,
 * which the query cannot express because nothing prunes `wish_groups` when a
 * membership goes.
 */
async function addedWishes(
  viewer: Viewer,
  since: string,
  names: ReadonlyMap<UserId, string>,
  peerGroups: ReadonlyMap<UserId, ReadonlySet<GroupId>>,
  others: string[],
): Promise<(ActivityItem | null)[]> {
  const { data, error } = await getSupabase()
    .from("wishes")
    .select(`${ACTIVITY_COLUMNS.added}, ${WISH_GROUPS_SCOPE}`)
    .in("owner_user_id", others)
    .in(
      "wish_groups.group_id",
      viewer.groups.map((group) => group.id),
    )
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);

  if (error) throw error;

  const rows = (data ?? []) as unknown as (AddedActivityRow & WishGroupsEmbed)[];

  return rows.map(({ wish_groups, ...row }) => {
    const owner = asUserId(row.owner_user_id);
    const group = labelGroup(
      embeddedGroupIds(wish_groups),
      peerGroups.get(owner) ?? new Set<GroupId>(),
      viewer.groups,
    );
    return group ? toAddedActivity({ ...row, owner_user_id: owner }, names, group) : null;
  });
}

/**
 * PRIVACY-RULE: `.neq("owner_user_id", …)` is what makes this a non-owner
 * -serving path, and therefore what makes selecting `claimed_by_user_id` here
 * legal at all.
 *
 * Reservations made on lists the viewer can read. The filter below is the first
 * of two; `toClaimActivity` refuses the viewer's own wish a second time, so
 * neither one alone is load-bearing. docs/decisions/privacy-rule.md
 *
 * Also scoped, same as `addedWishes`, to a wish tagged for one of the viewer's
 * own groups: `WISH_GROUPS_SCOPE`'s `!inner` join narrows the embed before
 * `ACTIVITY_LIMIT` is applied, so a claim on a tag the viewer cannot see does
 * not spend a limit slot the viewer was never going to be shown. `labelGroup`
 * still runs afterwards for the owner-has-since-left check the query cannot
 * express.
 */
async function claimedWishes(
  viewer: Viewer,
  since: string,
  names: ReadonlyMap<UserId, string>,
  peerGroups: ReadonlyMap<UserId, ReadonlySet<GroupId>>,
  others: string[],
): Promise<(ActivityItem | null)[]> {
  const { data, error } = await getSupabase()
    .from("wishes")
    .select(`${ACTIVITY_COLUMNS.claimed}, ${WISH_GROUPS_SCOPE}`)
    .in("owner_user_id", others)
    .in(
      "wish_groups.group_id",
      viewer.groups.map((group) => group.id),
    )
    .neq("owner_user_id", viewer.userId)
    .neq("claimed_by_user_id", viewer.userId)
    .not("claimed_by_user_id", "is", null)
    .gte("claimed_at", since)
    .order("claimed_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);

  if (error) throw error;

  const rows = (data ?? []) as unknown as (ClaimActivityRow & WishGroupsEmbed)[];

  return rows.map(({ wish_groups, ...row }) => {
    const owner = asUserId(row.owner_user_id);
    const group = labelGroup(
      embeddedGroupIds(wish_groups),
      peerGroups.get(owner) ?? new Set<GroupId>(),
      viewer.groups,
    );
    if (!group) return null;

    return toClaimActivity(
      {
        ...row,
        owner_user_id: owner,
        claimed_by_user_id: row.claimed_by_user_id
          ? asUserId(row.claimed_by_user_id)
          : null,
      },
      viewer.userId,
      viewer.peers,
      names,
      group,
    );
  });
}

/**
 * Gifts handed over that the viewer was one half of. Both names and the group
 * names are snapshots on the record, so nothing is joined and nothing here can
 * outlive a group.
 */
async function fulfilledGifts(
  viewer: Viewer,
  since: string,
): Promise<ActivityItem[]> {
  const { data, error } = await getSupabase()
    .from("fulfilled_wishes")
    .select(
      "id, owner_id, owner_name, giver_id, giver_name, title, group_names, fulfilled_at",
    )
    .or(`owner_id.eq.${viewer.userId},giver_id.eq.${viewer.userId}`)
    .gte("fulfilled_at", since)
    .order("fulfilled_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);

  if (error) throw error;

  const rows = (data ?? []) as {
    id: string;
    owner_id: string | null;
    owner_name: string;
    giver_id: string | null;
    giver_name: string;
    title: string;
    group_names: string[];
    fulfilled_at: string;
  }[];

  return rows.map((row) => ({
    kind: "wish-fulfilled" as const,
    id: row.id,
    at: row.fulfilled_at,
    title: row.title,
    owner: { id: asUserId(row.owner_id ?? ""), name: row.owner_name },
    giver: { id: asUserId(row.giver_id ?? ""), name: row.giver_name },
    groupNames: row.group_names ?? [],
    viewerIsOwner: row.owner_id === viewer.userId,
  }));
}

/** People who joined one of the viewer's groups. No privacy surface. */
async function joinedMembers(
  viewer: Viewer,
  since: string,
): Promise<(ActivityItem | null)[]> {
  const { data, error } = await getSupabase()
    .from("memberships")
    .select("user_id, group_id, name, created_at")
    .in("group_id", viewer.groups.map((group) => group.id))
    .neq("user_id", viewer.userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);

  if (error) throw error;

  const rows = (data ?? []) as {
    user_id: string;
    group_id: string;
    name: string;
    created_at: string;
  }[];

  return rows.map((row) => {
    const groupId = asGroupId(row.group_id);
    const group = viewer.groups.find((candidate) => candidate.id === groupId);
    if (!group) return null;

    return {
      kind: "member-joined" as const,
      at: row.created_at,
      // The membership row *is* the per-group label, so this needs no lookup.
      member: { id: asUserId(row.user_id), name: row.name },
      group,
    };
  });
}

/**
 * What happened in the viewer's groups lately, and how much of it is new.
 *
 * `cache`d because the header renders once per request but Next may ask twice
 * while streaming the Suspense boundary it sits behind.
 *
 * Wrapped so any failure here returns an empty feed instead of throwing: this
 * read is purely decorative -- a bell that comes up empty is a smaller loss
 * than a header that 500s the whole site -- and migrations reach production by
 * hand, so code can ship a request ahead of `0012_activity_seen.sql`, in which
 * case `lastSeenAt`'s `select activity_seen_at` errors. Nothing else in
 * `src/lib/data/` gets this treatment: every other read there is load-bearing
 * and must keep throwing.
 */
export const getActivity = cache(
  async (viewer: Viewer): Promise<ActivityFeed> => {
    try {
      if (viewer.groups.length === 0) return EMPTY;

      const others = othersVisibleTo(viewer);
      const since = activityWindowStart(new Date());

      // `fulfilled` and `joined` need neither `names` nor `peerGroups`, so they
      // ride in this round instead of waiting behind it -- only the two wish
      // reads below need what this round produces.
      const [names, peerGroups, seenAt, fulfilled, joined] = await Promise.all([
        getPeerNames(viewer),
        getPeerGroups(viewer),
        lastSeenAt(viewer),
        fulfilledGifts(viewer, since),
        joinedMembers(viewer, since),
      ]);

      const [added, claimed] = await Promise.all([
        others.length > 0
          ? addedWishes(viewer, since, names, peerGroups, others)
          : [],
        others.length > 0
          ? claimedWishes(viewer, since, names, peerGroups, others)
          : [],
      ]);

      const items = mergeActivity([added, claimed, fulfilled, joined]);
      return { items, unseen: countUnseen(items, seenAt) };
    } catch {
      return EMPTY;
    }
  },
);
