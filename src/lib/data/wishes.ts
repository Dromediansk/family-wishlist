import "server-only";

import { getPeerGroups, getPeerNames, groupIdsOf } from "@/lib/data/members";
import { asGroupId, asUserId, type GroupId, type UserId } from "@/lib/ids";
import { getSupabase } from "@/lib/supabase";
import type { ClaimedWish, GroupContext, Viewer, WishListView } from "@/lib/types";
import { canReadList, liveWishGroups, wishVisibleTo } from "@/lib/visibility";
import {
  OWNER_WISH_COLUMNS,
  VIEWER_WISH_COLUMNS,
  WISH_GROUPS_EMBED,
  WISH_GROUPS_SCOPE,
  toClaimedWish,
  toOwnerWish,
  toViewerWish,
  type ClaimedWishRow,
  type OwnerWishRow,
  type ViewerWishRow,
} from "@/lib/wishes";

/** The `wish_groups` embed as PostgREST hands it back, ids not yet branded. */
type WishGroupsEmbed = { wish_groups: { group_id: string }[] };

/**
 * The one place a `wish_groups` embed becomes branded ids: read from a column
 * that references `groups`, so this boundary is what can vouch for them.
 */
function embeddedGroupIds(embed: { group_id: string }[]): GroupId[] {
  return embed.map((row) => asGroupId(row.group_id));
}

/**
 * Is this wish, right now, tagged with a group the viewer *and* its owner both
 * belong to? The impure half of `wishVisibleTo`, in one place because the two
 * id-lookup paths below are both privacy-rule enforcement points and must not
 * be able to drift apart. docs/content/privacy-rule.md#where-the-rule-is-enforced
 *
 * The owner's current groups are fetched rather than trusted from the tag
 * alone: nothing prunes `wish_groups` when its owner leaves a group, so a stale
 * tag must not go on answering for a membership that is gone. `groupIdsOf` is
 * `cache`d, so asking twice in one request costs one trip.
 */
async function wishReachableBy(
  viewer: Viewer,
  ownerId: UserId,
  embed: { group_id: string }[],
): Promise<boolean> {
  return wishVisibleTo(
    new Set(embeddedGroupIds(embed)),
    new Set(viewer.groups.map((group) => group.id)),
    new Set(await groupIdsOf(ownerId)),
  );
}

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
      .select(`${OWNER_WISH_COLUMNS}, ${WISH_GROUPS_EMBED}`)
      .eq("owner_user_id", ownerId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rows = (data ?? []) as unknown as (OwnerWishRow & WishGroupsEmbed)[];

    // The viewer *is* the owner on this branch, so their groups are the ones a
    // tag has to still name to count. Built once rather than per wish.
    const ownerGroupIds = new Set(ctx.groups.map((group) => group.id));

    return {
      viewerIsOwner: true,
      wishes: rows.map(({ wish_groups, ...row }) => ({
        ...toOwnerWish(row),
        groupIds: liveWishGroups(embeddedGroupIds(wish_groups), ownerGroupIds),
      })),
    };
  }

  const [listResult, names] = await Promise.all([
    supabase
      .from("wishes")
      // The embed is the filter and nothing else — `!inner` is what makes the
      // `.eq` below drop a wish tagged for one of the owner's other groups,
      // rather than hand it over with an empty embed. Its rows are never read.
      .select(`${VIEWER_WISH_COLUMNS}, ${WISH_GROUPS_SCOPE}`)
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
  const viewerRows = (listResult.data ?? []) as unknown as ViewerWishRow[];

  return {
    viewerIsOwner: false,
    wishes: viewerRows.map((row) => toViewerWish(row, ctx.peers, names)),
  };
}

/**
 * Everything the viewer has claimed, across every list in every group they are
 * in. A claim cannot exist between people who share no group:
 * `memberships_release_claims` fires on membership deletion, and clears one out
 * the moment the shared group behind it is gone — so this needs no peer filter
 * of its own.
 *
 * The tags come back too, narrowed to the groups the viewer and the owner both
 * stand in: `getPeerGroups` is already scoped to the viewer's groups, so the
 * same `liveWishGroups` the owner branch uses does both halves at once. A group
 * only one of the two reaches never reaches the page.
 * docs/content/claiming.md#what-im-buying
 */
export async function getClaimedBy(viewer: Viewer): Promise<ClaimedWish[]> {
  const [result, names, peerGroups] = await Promise.all([
    getSupabase()
      .from("wishes")
      // A plain embed, not WISH_GROUPS_SCOPE: here the rows are read rather
      // than used as a filter, and the claim is already proof of reachability.
      .select(`${OWNER_WISH_COLUMNS}, owner_user_id, ${WISH_GROUPS_EMBED}`)
      .eq("claimed_by_user_id", viewer.userId)
      // Newest first. Ordering needs no projection, and no date is displayed.
      .order("claimed_at", { ascending: false }),
    getPeerNames(viewer),
    getPeerGroups(viewer),
  ]);

  if (result.error) throw result.error;

  const rows = (result.data ?? []) as unknown as (ClaimedWishRow &
    WishGroupsEmbed)[];

  return rows.map(({ wish_groups, ...row }) =>
    toClaimedWish(
      row,
      names,
      liveWishGroups(
        embeddedGroupIds(wish_groups),
        // Explicitly typed: a bare `new Set()` infers Set<never> and only
        // slips past on TypeScript's bivariant method parameters.
        peerGroups.get(row.owner_user_id) ?? new Set<GroupId>(),
      ),
    ),
  );
}

/**
 * Whose list a wish is on, or null when there is no such wish or
 * `wishReachableBy` says no. Every answer is the same refusal to the caller,
 * which is what keeps a stranger's wish id from being distinguishable from a
 * nonexistent one — including for the owner's own wish, which nothing here
 * needs to single out: an owner cannot claim off their own list anyway.
 */
export async function getWishOwner(
  viewer: Viewer,
  wishId: string,
): Promise<UserId | null> {
  const { data, error } = await getSupabase()
    .from("wishes")
    .select(`owner_user_id, ${WISH_GROUPS_EMBED}`)
    .eq("id", wishId)
    .maybeSingle();

  if (error) throw error;

  const row = data as (WishGroupsEmbed & { owner_user_id: string }) | null;
  if (!row) return null;

  const ownerId = asUserId(row.owner_user_id);
  if (!(await wishReachableBy(viewer, ownerId, row.wish_groups))) return null;

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
 * group they have since left must not cost them their own picture. That
 * short-circuit is the one thing this path and `getWishOwner` do differently;
 * everything after it is the shared `wishReachableBy`.
 *
 * Its checks are what the photo route relies on to answer 404 — not 403 — to
 * everything it declines, so the response says nothing about which wishes
 * exist either. docs/content/privacy-rule.md#serving-a-photo
 */
export async function getWishPhotoPath(
  viewer: Viewer,
  wishId: string,
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("wishes")
    .select(`photo_path, owner_user_id, ${WISH_GROUPS_EMBED}`)
    .eq("id", wishId)
    .maybeSingle();

  if (error) throw error;

  const row = data as
    | (WishGroupsEmbed & { photo_path: string | null; owner_user_id: string })
    | null;
  if (!row) return null;

  const ownerId = asUserId(row.owner_user_id);
  if (viewer.userId === ownerId) return row.photo_path;

  if (!(await wishReachableBy(viewer, ownerId, row.wish_groups))) return null;

  return row.photo_path;
}
