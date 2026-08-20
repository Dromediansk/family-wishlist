import "server-only";

import { getPeerNames } from "@/lib/data/members";
import { asUserId, type GroupId, type UserId } from "@/lib/ids";
import { getSupabase } from "@/lib/supabase";
import type { ClaimedWish, Viewer, WishListView } from "@/lib/types";
import { canReadList } from "@/lib/visibility";
import {
  OWNER_WISH_COLUMNS,
  VIEWER_WISH_COLUMNS,
  toClaimedWish,
  toOwnerWish,
  toViewerWish,
  type ClaimedWishRow,
  type OwnerWishRow,
  type ViewerWishRow,
} from "@/lib/wishes";

/**
 * One person's wish list, shaped for whoever is looking. The owner branch
 * selects only the non-claim columns, so claim data never leaves the database on
 * that path. docs/content/privacy-rule.md#reading-a-list
 */
export async function getWishListFor(
  viewer: Viewer,
  ownerId: UserId,
  currentGroupId?: GroupId,
): Promise<WishListView> {
  /*
   * The page asks `getPeerUser` first and 404s on null, so reaching this line
   * is a bug in the caller rather than anything a visitor can do.
   */
  if (!canReadList(viewer.peers, ownerId)) {
    throw new Error("getWishListFor called for a non-peer");
  }

  const supabase = getSupabase();

  if (viewer.userId === ownerId) {
    const { data, error } = await supabase
      .from("wishes")
      .select(OWNER_WISH_COLUMNS)
      .eq("owner_user_id", ownerId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return {
      viewerIsOwner: true,
      wishes: ((data ?? []) as unknown as OwnerWishRow[]).map(toOwnerWish),
    };
  }

  const [listResult, names] = await Promise.all([
    supabase
      .from("wishes")
      .select(VIEWER_WISH_COLUMNS)
      .eq("owner_user_id", ownerId)
      .order("created_at", { ascending: true }),
    getPeerNames(viewer, currentGroupId),
  ]);

  if (listResult.error) throw listResult.error;

  /*
   * The cast is where the id columns become branded: they were just read from
   * columns that reference app_users, so this is the boundary that can vouch
   * for them. Same for getClaimedBy below.
   */
  return {
    viewerIsOwner: false,
    wishes: ((listResult.data ?? []) as unknown as ViewerWishRow[]).map((row) =>
      toViewerWish(row, viewer.peers, names),
    ),
  };
}

/**
 * Everything the viewer has claimed, across every list in every group they are
 * in. A claim cannot exist between people who share no group, so this needs no
 * peer filter of its own.
 */
export async function getClaimedBy(viewer: Viewer): Promise<ClaimedWish[]> {
  const [result, names] = await Promise.all([
    getSupabase()
      .from("wishes")
      .select(`${OWNER_WISH_COLUMNS}, owner_user_id`)
      .eq("claimed_by_user_id", viewer.userId)
      // Newest first. Ordering needs no projection, and no date is displayed.
      .order("claimed_at", { ascending: false }),
    getPeerNames(viewer),
  ]);

  if (result.error) throw result.error;
  return ((result.data ?? []) as unknown as ClaimedWishRow[]).map((row) =>
    toClaimedWish(row, names),
  );
}

/**
 * The Storage key of one wish's photo, or null when the viewer may not have it.
 *
 * An owner reads their own list through the photo route too, so this is an
 * owner-serving path: it selects the photo path and the owner and never a claim
 * column. The owner is what the peer check needs — without it the route serves
 * any wish's photo to anybody signed in, which is a cross-group leak the moment
 * there is more than one group.
 * docs/content/privacy-rule.md#serving-a-photo
 */
export async function getWishPhotoPath(
  viewer: Viewer,
  wishId: string,
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("wishes")
    .select("photo_path, owner_user_id")
    .eq("id", wishId)
    .maybeSingle();

  if (error) throw error;

  const row = data as {
    photo_path: string | null;
    owner_user_id: string;
  } | null;
  if (!row) return null;
  if (!canReadList(viewer.peers, asUserId(row.owner_user_id))) return null;

  return row.photo_path;
}
