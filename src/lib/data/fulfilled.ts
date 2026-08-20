import "server-only";

import {
  FULFILLED_WISH_COLUMNS,
  toFulfilledWish,
  type FulfilledWishRow,
} from "@/lib/fulfilled";
import type { UserId } from "@/lib/ids";
import { getSupabase } from "@/lib/supabase";
import type { FulfilledWish, Viewer } from "@/lib/types";

/**
 * The two halves of history. Each `eq` hits one of the composite indexes on
 * fulfilled_wishes, which are already in "one person's rows, newest first"
 * order, so neither read needs a sort step.
 *
 * Neither is `cache`d: one page calls one of them, once.
 */
export async function getGivenBy(viewer: Viewer): Promise<FulfilledWish[]> {
  return readFulfilled("giver_id", viewer.userId);
}

export async function getReceivedBy(viewer: Viewer): Promise<FulfilledWish[]> {
  return readFulfilled("owner_id", viewer.userId);
}

async function readFulfilled(
  column: "giver_id" | "owner_id",
  userId: UserId,
): Promise<FulfilledWish[]> {
  const { data, error } = await getSupabase()
    .from("fulfilled_wishes")
    .select(FULFILLED_WISH_COLUMNS)
    .eq(column, userId)
    .order("fulfilled_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as FulfilledWishRow[]).map(toFulfilledWish);
}
