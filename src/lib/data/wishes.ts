import "server-only";

import { getPeerNames, groupIdsOf } from "@/lib/data/members";
import { asGroupId, asUserId, type UserId } from "@/lib/ids";
import { getSupabase } from "@/lib/supabase";
import type { ClaimedWish, GroupContext, Viewer, WishListView } from "@/lib/types";
import { canReadList, wishVisibleTo } from "@/lib/visibility";
import {
  OWNER_WISH_COLUMNS,
  VIEWER_WISH_COLUMNS,
  toClaimedWish,
  toOwnerWish,
  toViewerWish,
  type ClaimedWishRow,
  type ViewerWishRow,
} from "@/lib/wishes";

/**
 * One person's wish list, shaped for whoever is looking. The owner branch
 * selects only the non-claim columns, so claim data never leaves the database
 * on that path. docs/content/privacy-rule.md#reading-a-list
 *
 * The non-owner branch is scoped to `ctx.groupId`: a wish tagged for a
 * different one of the owner's groups does not appear here, even when the
 * viewer is also a peer of the owner through that other group.
 */
export async function getWishListFor(
  ctx: GroupContext,
  ownerId: UserId,
): Promise<WishListView> {
  /*
   * The page asks `getGroupPeerUser` first and 404s on null, so reaching this
   * line is a bug in the caller rather than anything a visitor can do.
   */
  if (!canReadList(ctx.peers, ownerId)) {
    throw new Error("getWishListFor called for a non-peer");
  }

  const supabase = getSupabase();

  if (ctx.userId === ownerId) {
    const { data, error } = await supabase
      .from("wishes")
      .select(`${OWNER_WISH_COLUMNS}, wish_groups(group_id)`)
      .eq("owner_user_id", ownerId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as unknown as {
      id: string;
      title: string;
      description: string | null;
      url: string | null;
      photo_path: string | null;
      created_at: string;
      wish_groups: { group_id: string }[];
    }[];

    return {
      viewerIsOwner: true,
      wishes: rows.map((row) =>
        toOwnerWish({
          id: row.id,
          title: row.title,
          description: row.description,
          url: row.url,
          photo_path: row.photo_path,
          created_at: row.created_at,
          group_ids: row.wish_groups.map((g) => asGroupId(g.group_id)),
        }),
      ),
    };
  }

  const [listResult, names] = await Promise.all([
    supabase
      .from("wishes")
      .select(`${VIEWER_WISH_COLUMNS}, wish_groups!inner(group_id)`)
      .eq("owner_user_id", ownerId)
      .eq("wish_groups.group_id", ctx.groupId)
      .order("created_at", { ascending: true }),
    getPeerNames(ctx, ctx.groupId),
  ]);

  if (listResult.error) throw listResult.error;

  /*
   * The cast is where the id columns become branded: they were just read from
   * columns that reference app_users, so this is the boundary that can vouch
   * for them. Same for getClaimedBy below.
   */
  const viewerRows = (listResult.data ?? []) as unknown as (Omit<
    ViewerWishRow,
    "group_ids"
  > & { wish_groups: { group_id: string }[] })[];

  return {
    viewerIsOwner: false,
    wishes: viewerRows.map(({ wish_groups, ...row }) =>
      toViewerWish(
        { ...row, group_ids: wish_groups.map((g) => asGroupId(g.group_id)) },
        ctx.peers,
        names,
      ),
    ),
  };
}

/**
 * Everything the viewer has claimed, across every list in every group they are
 * in. A claim cannot exist between people who share no group:
 * `memberships_release_claims` fires on membership deletion, and clears one out
 * the moment the shared group behind it is gone — so this needs no peer filter
 * of its own.
 */
export async function getClaimedBy(viewer: Viewer): Promise<ClaimedWish[]> {
  const [result, names] = await Promise.all([
    getSupabase()
      .from("wishes")
      .select(`${OWNER_WISH_COLUMNS}, owner_user_id, wish_groups(group_id)`)
      .eq("claimed_by_user_id", viewer.userId)
      // Newest first. Ordering needs no projection, and no date is displayed.
      .order("claimed_at", { ascending: false }),
    getPeerNames(viewer),
  ]);

  if (result.error) throw result.error;

  const rows = (result.data ?? []) as unknown as (Omit<
    ClaimedWishRow,
    "group_ids"
  > & { wish_groups: { group_id: string }[] })[];

  return rows.map(({ wish_groups, ...row }) =>
    toClaimedWish(
      { ...row, group_ids: wish_groups.map((g) => asGroupId(g.group_id)) },
      names,
    ),
  );
}

/**
 * Whose list a wish is on, or null when there is no such wish or it is not,
 * right now, tagged with a group both the viewer and its owner belong to.
 * Every answer is the same refusal to the caller, which is what keeps a
 * stranger's wish id from being distinguishable from a nonexistent one.
 *
 * The owner's current groups are re-fetched rather than trusted from the tag
 * alone: nothing prunes `wish_groups` when its owner leaves a group, so a
 * stale tag must not go on answering for a membership that is gone. Sharing
 * *some* group with the owner is not enough either — it has to be the same
 * group the wish is tagged with.
 */
export async function getWishOwner(
  viewer: Viewer,
  wishId: string,
): Promise<UserId | null> {
  const { data, error } = await getSupabase()
    .from("wishes")
    .select("owner_user_id, wish_groups(group_id)")
    .eq("id", wishId)
    .maybeSingle();

  if (error) throw error;

  const row = data as
    | { owner_user_id: string; wish_groups: { group_id: string }[] }
    | null;
  if (!row) return null;

  const ownerId = asUserId(row.owner_user_id);
  const wishGroupIds = new Set(
    row.wish_groups.map((g) => asGroupId(g.group_id)),
  );
  const viewerGroupIds = new Set(viewer.groups.map((g) => g.id));
  const ownerGroupIds = new Set(await groupIdsOf(ownerId));
  if (!wishVisibleTo(wishGroupIds, viewerGroupIds, ownerGroupIds)) return null;

  return ownerId;
}

/**
 * The Storage key of one wish's photo, or null when the viewer may not have
 * it.
 *
 * An owner reads their own list through the photo route too, so this is an
 * owner-serving path: it selects the photo path, the owner and the wish's
 * tagged groups, and never a claim column. The owner is answered from the
 * owner check alone — their own list is unscoped, and a tag left stale by a
 * group they have since left must not cost them their own picture.
 *
 * Everybody else needs the wish tagged with a group *both* they and the
 * owner currently belong to — not merely some group they happen to share
 * with the owner elsewhere. `wishVisibleTo` re-fetches the owner's current
 * groups for exactly that reason: a tag survives the owner leaving the
 * group it named, since nothing prunes `wish_groups`. The checks are what
 * the photo route relies on to answer 404 — not 403 — to everything it
 * declines, so the response says nothing about which wishes exist either.
 * docs/content/privacy-rule.md#serving-a-photo
 */
export async function getWishPhotoPath(
  viewer: Viewer,
  wishId: string,
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("wishes")
    .select("photo_path, owner_user_id, wish_groups(group_id)")
    .eq("id", wishId)
    .maybeSingle();

  if (error) throw error;

  const row = data as
    | {
        photo_path: string | null;
        owner_user_id: string;
        wish_groups: { group_id: string }[];
      }
    | null;
  if (!row) return null;

  const ownerId = asUserId(row.owner_user_id);
  if (viewer.userId === ownerId) return row.photo_path;

  const wishGroupIds = new Set(
    row.wish_groups.map((g) => asGroupId(g.group_id)),
  );
  const viewerGroupIds = new Set(viewer.groups.map((g) => g.id));
  const ownerGroupIds = new Set(await groupIdsOf(ownerId));
  if (!wishVisibleTo(wishGroupIds, viewerGroupIds, ownerGroupIds)) return null;

  return row.photo_path;
}
