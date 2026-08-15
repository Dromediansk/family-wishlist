import "server-only";

import { cache } from "react";

import { getSupabase } from "@/lib/supabase";
import { readMemberIdCookie } from "@/lib/session";
import type {
  ClaimedWish,
  Member,
  MemberWithCount,
  WishListView,
} from "@/lib/types";
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

type MemberRow = {
  id: string;
  name: string;
  role: string;
  created_at: string;
};

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    role: row.role === "admin" ? "admin" : "member",
    createdAt: row.created_at,
  };
}

/**
 * `cache` dedupes these within a single render, so the header and the page can
 * each ask who the current member is without two round trips.
 */
export const getMembers = cache(async (): Promise<MemberWithCount[]> => {
  const supabase = getSupabase();

  const [membersResult, wishesResult] = await Promise.all([
    supabase
      .from("family_members")
      .select("id, name, role, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("wishes").select("member_id"),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (wishesResult.error) throw wishesResult.error;

  const counts = new Map<string, number>();
  for (const row of (wishesResult.data ?? []) as { member_id: string }[]) {
    counts.set(row.member_id, (counts.get(row.member_id) ?? 0) + 1);
  }

  return ((membersResult.data ?? []) as MemberRow[]).map((row) => ({
    ...toMember(row),
    wishCount: counts.get(row.id) ?? 0,
  }));
});

export const getMemberById = cache(async (id: string): Promise<Member | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("family_members")
    .select("id, name, role, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? toMember(data as MemberRow) : null;
});

export async function countMembers(): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("family_members")
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count ?? 0;
}

/**
 * The member the visitor claims to be, per their cookie.
 *
 * Returns null when the cookie is missing or points at a member who has since
 * been deleted. The cookie is not cleared here — a Server Component render
 * cannot write cookies — the identity gate simply reappears and overwrites it.
 */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const id = await readMemberIdCookie();
  if (!id) return null;
  return getMemberById(id);
});

/**
 * Read one member's wish list, shaped for whoever is looking at it.
 *
 * The owner branch selects only the non-claim columns, so claim data never
 * leaves the database on that path — the filtering is in the query as well as
 * in the mapper.
 */
export async function getWishListFor(
  ownerId: string,
  viewerId: string | null,
): Promise<WishListView> {
  const supabase = getSupabase();
  const viewerIsOwner = viewerId !== null && viewerId === ownerId;

  if (viewerIsOwner) {
    const { data, error } = await supabase
      .from("wishes")
      .select(OWNER_WISH_COLUMNS)
      .eq("member_id", ownerId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return {
      viewerIsOwner: true,
      wishes: ((data ?? []) as unknown as OwnerWishRow[]).map(toOwnerWish),
    };
  }

  const { data, error } = await supabase
    .from("wishes")
    .select(VIEWER_WISH_COLUMNS)
    .eq("member_id", ownerId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return {
    viewerIsOwner: false,
    wishes: ((data ?? []) as unknown as ViewerWishRow[]).map(toViewerWish),
  };
}

/** Everything the current member has claimed, across all lists. */
export async function getClaimedBy(memberId: string): Promise<ClaimedWish[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .select(`${OWNER_WISH_COLUMNS}, claimed_at, owner:member_id (id, name)`)
    .eq("claimed_by", memberId)
    .order("claimed_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as ClaimedWishRow[]).map(toClaimedWish);
}
