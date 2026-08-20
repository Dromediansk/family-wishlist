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
import type {
  GroupContext,
  MemberSummary,
  MemberWithCount,
  PeerUser,
  Viewer,
} from "@/lib/types";
import { canReadList, preferredName } from "@/lib/visibility";

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
 * Everybody in one group, in join order, with how many wishes each of them has.
 *
 * Both ids come back: `id` is the membership an admin control addresses, and
 * `userId` is the account a list link and every visibility check address.
 *
 * `cache` dedupes within a render, so the header and the page share one trip.
 */
export const getGroupMembers = cache(
  async (ctx: GroupContext): Promise<MemberWithCount[]> => {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("memberships")
      .select(MEMBERSHIP_COLUMNS)
      .eq("group_id", ctx.groupId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as MembershipRow[];
    if (rows.length === 0) return [];

    const { data: wishRows, error: wishError } = await supabase
      .from("wishes")
      .select("owner_user_id")
      .in(
        "owner_user_id",
        rows.map((row) => row.user_id),
      );

    if (wishError) throw wishError;

    const counts = tally(wishRows);

    return rows.map((row) => {
      const userId = asUserId(row.user_id);
      return {
        id: asMembershipId(row.id),
        userId,
        name: row.name,
        role: row.role === "admin" ? "admin" : "member",
        createdAt: row.created_at,
        wishCount: counts.get(userId) ?? 0,
      };
    });
  },
);

/**
 * The family grid: `getGroupMembers` plus, for everyone but the viewer, how
 * many of their wishes are still free.
 *
 * The availability query selects no claim column and drops the viewer's own rows
 * in the `WHERE` clause, so their number is never computed.
 * docs/content/privacy-rule.md#counting-on-the-family-grid
 *
 * Separate from `getGroupMembers` because the admin screen wants the plain total
 * in join order; `sortMemberSummaries` is the sole authority on the grid's own.
 */
export const getMemberSummaries = cache(
  async (ctx: GroupContext): Promise<MemberSummary[]> => {
    const [members, freeResult] = await Promise.all([
      getGroupMembers(ctx),
      getSupabase()
        .from("wishes")
        .select("owner_user_id")
        .is("claimed_by_user_id", null)
        .neq("owner_user_id", ctx.userId),
    ]);

    if (freeResult.error) throw freeResult.error;

    const free = tally(freeResult.data);

    return sortMemberSummaries(
      members.map((member) => toMemberSummary(member, free, ctx.userId)),
    );
  },
);

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
 * The person behind an id off a group's URL, or null unless a membership row
 * places them in that group. This is the check that stands between a guessed id
 * and somebody else's list; the page turns the null into a 404.
 *
 * The peers check comes first, which is also what keeps a malformed id out of
 * the query: nothing but a real user id is ever in that set.
 */
export async function getGroupPeerUser(
  ctx: GroupContext,
  userId: string,
): Promise<PeerUser | null> {
  const id = asUserId(userId);
  if (!canReadList(ctx.peers, id)) return null;

  const { data, error } = await getSupabase()
    .from("memberships")
    .select("user_id")
    .eq("group_id", ctx.groupId)
    .eq("user_id", id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  // Named through this group, so the heading and the wishes below it agree.
  const name = (await getPeerNames(ctx, ctx.groupId)).get(id);
  return name === undefined ? null : { id, name };
}
