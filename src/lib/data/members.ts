import "server-only";

import { cache } from "react";

import {
  asGroupId,
  asUserId,
  asMembershipId,
  type GroupId,
  type UserId,
} from "@/lib/ids";
import { sortMemberSummaries, toMemberSummary } from "@/lib/members";
import { getSupabase } from "@/lib/supabase";
import {
  toRole,
  type GroupContext,
  type MemberSummary,
  type MemberWithCount,
  type PeerUser,
  type Role,
  type Viewer,
} from "@/lib/types";
import { canReadList, preferredName } from "@/lib/visibility";
import { WISH_GROUPS_SCOPE } from "@/lib/wishes";

const MEMBERSHIP_COLUMNS = "id, user_id, name, role, created_at";

type MembershipRow = {
  id: string;
  user_id: string;
  name: string;
  role: string;
  created_at: string;
};

/** Wish rows in, wishes-per-owner out. */
function tally(rows: unknown): Map<UserId, number> {
  const counts = new Map<UserId, number>();
  for (const row of (rows ?? []) as { owner_user_id: string }[]) {
    const owner = asUserId(row.owner_user_id);
    counts.set(owner, (counts.get(owner) ?? 0) + 1);
  }
  return counts;
}

/**
 * The membership rows of one group, in join order. Split out from
 * `getGroupMembers` so the two tallies below can be issued together rather than
 * one behind the other; `cache` makes the two callers share one trip.
 */
const groupMemberships = cache(
  async (ctx: GroupContext): Promise<MembershipRow[]> => {
    const { data, error } = await getSupabase()
      .from("memberships")
      .select(MEMBERSHIP_COLUMNS)
      .eq("group_id", ctx.groupId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data ?? []) as MembershipRow[];
  },
);

/**
 * Every wish these people have that is tagged for this group — the query both
 * tallies below start from, so the group scope and the claim-free projection
 * are spelled once. `owner_user_id` is all it selects, and the `!inner` embed
 * is what makes the `.eq` drop a wish tagged only for one of the owner's other
 * groups. docs/content/privacy-rule.md#counting-on-the-family-grid
 */
function taggedWishesOf(ctx: GroupContext, userIds: string[]) {
  return getSupabase()
    .from("wishes")
    .select(`owner_user_id, ${WISH_GROUPS_SCOPE}`)
    .in("owner_user_id", userIds)
    .eq("wish_groups.group_id", ctx.groupId);
}

/** How many wishes each of these people has, tagged for this group. */
async function countWishes(
  ctx: GroupContext,
  userIds: string[],
): Promise<Map<UserId, number>> {
  const { data, error } = await taggedWishesOf(ctx, userIds);

  if (error) throw error;
  return tally(data);
}

function toMemberWithCount(
  row: MembershipRow,
  counts: ReadonlyMap<UserId, number>,
): MemberWithCount {
  const userId = asUserId(row.user_id);
  return {
    id: asMembershipId(row.id),
    userId,
    name: row.name,
    role: toRole(row.role),
    createdAt: row.created_at,
    wishCount: counts.get(userId) ?? 0,
  };
}

/**
 * Everybody in one group, in join order, with how many wishes each of them has.
 *
 * Both ids come back: `id` is the membership an admin control addresses, and
 * `userId` is the account a list link and every visibility check address.
 *
 * `cache` dedupes within a render, so the header and the page share one trip.
 */
export const getGroupMembers = cache(
  async (ctx: GroupContext): Promise<MemberWithCount[]> => {
    const rows = await groupMemberships(ctx);
    if (rows.length === 0) return [];

    const counts = await countWishes(
      ctx,
      rows.map((row) => row.user_id),
    );
    return rows.map((row) => toMemberWithCount(row, counts));
  },
);

/**
 * The family grid: every member's total, plus — for everyone but the viewer —
 * how many of their wishes are still free.
 *
 * The availability query is scoped to this group's own members with
 * `.in("owner_user_id", …)` and to this group's own wishes with the
 * `wish_groups` join, selects no claim column, and drops the viewer's own
 * rows in the `WHERE` clause, so their number is never computed.
 * docs/content/privacy-rule.md#counting-on-the-family-grid
 *
 * The two tallies share one `.in(…)` list and depend on nothing but the
 * memberships, so they go out together.
 *
 * Separate from `getGroupMembers` because the admin screen wants the plain total
 * in join order; `sortMemberSummaries` is the sole authority on the grid's own.
 */
export const getMemberSummaries = cache(
  async (ctx: GroupContext): Promise<MemberSummary[]> => {
    const rows = await groupMemberships(ctx);
    if (rows.length === 0) return [];

    const userIds = rows.map((row) => row.user_id);

    const [counts, freeResult] = await Promise.all([
      countWishes(ctx, userIds),
      taggedWishesOf(ctx, userIds)
        .is("claimed_by_user_id", null)
        .neq("owner_user_id", ctx.userId),
    ]);

    if (freeResult.error) throw freeResult.error;

    const free = tally(freeResult.data);

    return sortMemberSummaries(
      rows.map((row) =>
        toMemberSummary(toMemberWithCount(row, counts), free, ctx.userId),
      ),
    );
  },
);

/**
 * How many admins this group has. The last one cannot be demoted or removed, or
 * nobody could ever manage the group again — and that count is a *read*, so it
 * belongs here rather than inline in the action that needs it.
 */
export async function countGroupAdmins(ctx: GroupContext): Promise<number> {
  const { count, error } = await getSupabase()
    .from("memberships")
    .select("id", { count: "exact", head: true })
    .eq("group_id", ctx.groupId)
    .eq("role", "admin");

  if (error) throw error;
  return count ?? 0;
}

/**
 * The role one membership holds in `ctx`'s group, or null when no such row is
 * in it. Scoped to the group in the query, so a membership id from another
 * group reads as absent.
 */
export async function getMembershipRole(
  ctx: GroupContext,
  membershipId: string,
): Promise<Role | null> {
  const { data, error } = await getSupabase()
    .from("memberships")
    .select("role")
    .eq("id", membershipId)
    .eq("group_id", ctx.groupId)
    .maybeSingle();

  if (error) throw error;
  const row = data as { role: string } | null;
  return row ? toRole(row.role) : null;
}

/**
 * What to call each person the viewer can see, one name apiece.
 *
 * A name is a per-group label, so somebody in two of the viewer's groups has
 * two; `preferredName` picks which one this screen uses, and the whole map is
 * resolved through the same group so one screen stays self-consistent.
 */
export const getPeerNames = cache(
  async (
    viewer: Viewer,
    currentGroupId?: GroupId,
  ): Promise<ReadonlyMap<UserId, string>> => {
    if (viewer.groups.length === 0) return new Map();

    const { data, error } = await getSupabase()
      .from("memberships")
      .select("user_id, group_id, name")
      .in(
        "group_id",
        viewer.groups.map((group) => group.id),
      );

    if (error) throw error;

    const namesByUser = new Map<UserId, Map<GroupId, string>>();
    for (const row of (data ?? []) as {
      user_id: string;
      group_id: string;
      name: string;
    }[]) {
      const user = asUserId(row.user_id);
      let byGroup = namesByUser.get(user);
      if (!byGroup) {
        byGroup = new Map();
        namesByUser.set(user, byGroup);
      }
      byGroup.set(asGroupId(row.group_id), row.name);
    }

    const resolved = new Map<UserId, string>();
    for (const [user, byGroup] of namesByUser) {
      resolved.set(user, preferredName(byGroup, viewer.groups, currentGroupId));
    }
    return resolved;
  },
);

/**
 * Every group a user belongs to. A wish or a claim is visible throughout the
 * owner's groups, not just the one the write happened in, so this is what
 * `notifyOwnerChanged` pings after.
 *
 * Ordered like every other membership read in this file — `live-refresh.tsx`
 * derives a stable subscription key from this array, and an unordered result
 * would make that key change on every call for no reason.
 */
export const groupIdsOf = cache(async (userId: UserId): Promise<GroupId[]> => {
  const { data, error } = await getSupabase()
    .from("memberships")
    .select("group_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as { group_id: string }[]).map((row) =>
    asGroupId(row.group_id),
  );
});

/**
 * The person behind an id off a group's URL, or null unless a membership row
 * places them in that group. This is the check that stands between a guessed id
 * and somebody else's list; the page turns the null into a 404.
 *
 * The peers check comes first, which is also what keeps a malformed id out of
 * the query: nothing but a real user id is ever in that set.
 *
 * The row that proves the membership carries the name to show, so this asks
 * once: a `memberships` row scoped to this group *is* the name through this
 * group, which is what makes the heading and the wishes below it agree.
 */
export async function getGroupPeerUser(
  ctx: GroupContext,
  userId: string,
): Promise<PeerUser | null> {
  const id = asUserId(userId);
  if (!canReadList(ctx.peers, id)) return null;

  const { data, error } = await getSupabase()
    .from("memberships")
    .select("user_id, name")
    .eq("group_id", ctx.groupId)
    .eq("user_id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { id, name: (data as { name: string }).name };
}
