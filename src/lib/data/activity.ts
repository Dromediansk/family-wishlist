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
import {
  FULFILLED_ACTIVITY_COLUMNS,
  snapshotGroupNames,
  type FulfilledActivityRow,
} from "@/lib/fulfilled";
import { asGroupId, asUserId, type GroupId, type UserId } from "@/lib/ids";
import { getSupabase } from "@/lib/supabase";
import type { ActivityItem, GroupRef, Viewer } from "@/lib/types";
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
 *
 * The one soft failure in `src/lib/data/` — every other read here throws, and
 * must. Migrations reach production by hand, so this code can ship a request
 * ahead of `0012_activity_seen.sql`, and until it lands `select
 * activity_seen_at` errors. Null is exactly what that degrades to: "never
 * looked", which opens the bell to the whole window. Scoped to this one
 * statement on purpose — a feed read that fails is a bug, not an empty bell,
 * and swallowing it would hide a mis-scoped privacy filter as "nothing
 * happened lately". Remove this once 0012 is applied.
 */
async function lastSeenAt(viewer: Viewer): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("app_users")
    .select("activity_seen_at")
    .eq("id", viewer.userId)
    .maybeSingle();

  if (error) return null;
  return (data as { activity_seen_at: string | null } | null)?.activity_seen_at ?? null;
}

/**
 * The rows of one wish read, each already labelled with the group its line will
 * carry — or dropped, when it reaches none the reader may be shown.
 *
 * The scoping the two wish reads share, spelled once: to people the viewer can
 * see, away from the viewer's own list, and to a wish tagged for one of the
 * viewer's own groups. `WISH_GROUPS_SCOPE`'s `!inner` join narrows the embed
 * itself, not just which rows come back, so `ACTIVITY_LIMIT` is spent on rows
 * the viewer could see in the first place rather than on ones `labelGroup`
 * would go on to discard. `labelGroup` still runs afterwards for the
 * owner-has-since-left check the query cannot express, because nothing prunes
 * `wish_groups` when a membership goes.
 *
 * Split in two so the caller can issue `query` in the same round as every other
 * read and `label` once `peerGroups` is in hand: the query needs neither.
 */
function wishActivityQuery(
  viewer: Viewer,
  columns: string,
  timeColumn: string,
  since: string,
  others: string[],
) {
  return getSupabase()
    .from("wishes")
    .select(`${columns}, ${WISH_GROUPS_SCOPE}`)
    .in("owner_user_id", others)
    .in(
      "wish_groups.group_id",
      viewer.groups.map((group) => group.id),
    )
    .gte(timeColumn, since)
    .order(timeColumn, { ascending: false })
    .limit(ACTIVITY_LIMIT);
}

type Labelled<Row> = { row: Row & { owner_user_id: UserId }; group: GroupRef };

function labelRows<Row extends { owner_user_id: string }>(
  rows: (Row & WishGroupsEmbed)[],
  viewer: Viewer,
  peerGroups: ReadonlyMap<UserId, ReadonlySet<GroupId>>,
): Labelled<Row>[] {
  const labelled: Labelled<Row>[] = [];

  for (const { wish_groups, ...rest } of rows) {
    const row = rest as unknown as Row;
    const owner = asUserId(row.owner_user_id);
    const group = labelGroup(
      embeddedGroupIds(wish_groups),
      peerGroups.get(owner) ?? new Set<GroupId>(),
      viewer.groups,
    );
    if (group) labelled.push({ row: { ...row, owner_user_id: owner }, group });
  }

  return labelled;
}

/** Wishes added to a list the viewer can read. */
function addedWishesQuery(viewer: Viewer, since: string, others: string[]) {
  return wishActivityQuery(
    viewer,
    ACTIVITY_COLUMNS.added,
    "created_at",
    since,
    others,
  );
}

/**
 * PRIVACY-RULE: `.neq("owner_user_id", …)` is what makes this a non-owner
 * -serving path, and therefore what makes selecting `claimed_by_user_id` here
 * legal at all. It stays spelled out here rather than inside
 * `wishActivityQuery`, where a shared builder would hide it from the audit.
 *
 * Reservations made on lists the viewer can read. The filter below is the first
 * of two; `toClaimActivity` refuses the viewer's own wish a second time, so
 * neither one alone is load-bearing. docs/decisions/privacy-rule.md
 */
function claimedWishesQuery(viewer: Viewer, since: string, others: string[]) {
  return wishActivityQuery(
    viewer,
    ACTIVITY_COLUMNS.claimed,
    "claimed_at",
    since,
    others,
  )
    .neq("owner_user_id", viewer.userId)
    .neq("claimed_by_user_id", viewer.userId)
    .not("claimed_by_user_id", "is", null);
}

/**
 * Gifts handed over that the viewer was one half of. Both names and the group
 * names are snapshots on the record, so nothing is joined and nothing here can
 * outlive a group.
 */
function fulfilledGiftsQuery(viewer: Viewer, since: string) {
  return getSupabase()
    .from("fulfilled_wishes")
    .select(FULFILLED_ACTIVITY_COLUMNS)
    .or(`owner_id.eq.${viewer.userId},giver_id.eq.${viewer.userId}`)
    .gte("fulfilled_at", since)
    .order("fulfilled_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);
}

/** People who joined one of the viewer's groups. No privacy surface. */
function joinedMembersQuery(viewer: Viewer, since: string) {
  return getSupabase()
    .from("memberships")
    .select("user_id, group_id, name, created_at")
    .in(
      "group_id",
      viewer.groups.map((group) => group.id),
    )
    .neq("user_id", viewer.userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(ACTIVITY_LIMIT);
}

type MembershipActivityRow = {
  user_id: string;
  group_id: string;
  name: string;
  created_at: string;
};

/** Every query above hands back `{ data, error }`; this is the one unwrapping. */
function rowsOf<Row>({
  data,
  error,
}: {
  data: unknown;
  error: { message: string } | null;
}): Row[] {
  if (error) throw error;
  return (data ?? []) as Row[];
}

/**
 * What happened in the viewer's groups lately, and how much of it is new.
 *
 * `cache`d because the header renders once per request but Next may ask twice
 * while streaming the Suspense boundary it sits behind.
 *
 * Every read rides one round: the two wish queries need `names` and
 * `peerGroups` only to *map* their rows, not to build their filters, so making
 * them wait behind that round would buy a second trip for nothing.
 */
export const getActivity = cache(
  async (viewer: Viewer): Promise<ActivityFeed> => {
    if (viewer.groups.length === 0) return EMPTY;

    const others = othersVisibleTo(viewer);
    const since = activityWindowStart(new Date());
    const hasOthers = others.length > 0;

    const [names, peerGroups, seenAt, fulfilledResult, joinedResult, addedResult, claimedResult] =
      await Promise.all([
        getPeerNames(viewer),
        getPeerGroups(viewer),
        lastSeenAt(viewer),
        fulfilledGiftsQuery(viewer, since),
        joinedMembersQuery(viewer, since),
        hasOthers ? addedWishesQuery(viewer, since, others) : null,
        hasOthers ? claimedWishesQuery(viewer, since, others) : null,
      ]);

    const added = addedResult
      ? labelRows<AddedActivityRow>(
          rowsOf<AddedActivityRow & WishGroupsEmbed>(addedResult),
          viewer,
          peerGroups,
        ).map(({ row, group }) => toAddedActivity(row, names, group))
      : [];

    const claimed = claimedResult
      ? labelRows<ClaimActivityRow>(
          rowsOf<ClaimActivityRow & WishGroupsEmbed>(claimedResult),
          viewer,
          peerGroups,
        ).map(({ row, group }) =>
          toClaimActivity(
            {
              ...row,
              claimed_by_user_id: row.claimed_by_user_id
                ? asUserId(row.claimed_by_user_id)
                : null,
            },
            viewer.userId,
            viewer.peers,
            names,
            group,
          ),
        )
      : [];

    const fulfilled = rowsOf<FulfilledActivityRow>(fulfilledResult).map((row) => ({
      kind: "wish-fulfilled" as const,
      id: row.id,
      at: row.fulfilled_at,
      title: row.title,
      ownerName: row.owner_name,
      giverName: row.giver_name,
      groupNames: snapshotGroupNames(row),
      viewerIsOwner: row.owner_id === viewer.userId,
    }));

    // Resolving an id to its `GroupRef`, not a second guard: the
    // `.in("group_id", …)` above is what guarantees every row names one of
    // these. Through a map rather than a `find` per row, same as `GroupTags`.
    const groupsById = new Map(viewer.groups.map((group) => [group.id, group]));
    const joined = rowsOf<MembershipActivityRow>(joinedResult).flatMap((row) => {
      const group = groupsById.get(asGroupId(row.group_id));
      return group
        ? [
            {
              kind: "member-joined" as const,
              at: row.created_at,
              // The membership row *is* the per-group label, so no name lookup.
              member: { id: asUserId(row.user_id), name: row.name },
              group,
            },
          ]
        : [];
    });

    const items = mergeActivity([added, claimed, fulfilled, joined]);
    return { items, unseen: countUnseen(items, seenAt) };
  },
);
