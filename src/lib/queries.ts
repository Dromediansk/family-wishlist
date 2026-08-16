import "server-only";

import { cache } from "react";

import { resolveAccess, type Access } from "@/lib/access";
import { toMemberSummary } from "@/lib/members";
import { getSupabase } from "@/lib/supabase";
import { getAuthUser } from "@/lib/supabase-auth";
import type {
  ClaimedWish,
  Member,
  MemberAccount,
  MemberStatus,
  MemberSummary,
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

const MEMBER_COLUMNS = "id, name, role, created_at";

type MemberRow = {
  id: string;
  name: string;
  role: string;
  created_at: string;
};

type MemberAccountRow = MemberRow & {
  status: string;
  email: string | null;
};

function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    name: row.name,
    role: row.role === "admin" ? "admin" : "member",
    createdAt: row.created_at,
  };
}

function toStatus(value: string): MemberStatus {
  return value === "active" ? "active" : "pending";
}

function toMemberAccount(row: MemberAccountRow): MemberAccount {
  return {
    ...toMember(row),
    status: toStatus(row.status),
    email: row.email,
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
      .select(MEMBER_COLUMNS)
      // People waiting to be approved are not in the family yet: they must not
      // appear on the grid, and nobody should be able to claim off their list.
      .eq("status", "active")
      .order("created_at", { ascending: true }),
    supabase.from("wishes").select("member_id"),
  ]);

  if (membersResult.error) throw membersResult.error;
  if (wishesResult.error) throw wishesResult.error;

  const counts = tally(wishesResult.data);

  return ((membersResult.data ?? []) as MemberRow[]).map((row) => ({
    ...toMember(row),
    wishCount: counts.get(row.id) ?? 0,
  }));
});

/**
 * The family grid: `getMembers` plus, for everyone but the viewer, how many of
 * their wishes nobody has taken yet.
 *
 * The availability query never selects a claim column, and it drops the viewer's
 * own rows in the `WHERE` clause — so the number that would tell them their list
 * has been raided is not computed, let alone sent. `toMemberSummary` withholds
 * it a second time. Kept apart from `getMembers` because the admin screen wants
 * the plain total and has no business receiving anything claim-derived.
 */
export const getMemberSummaries = cache(
  async (viewerId: string): Promise<MemberSummary[]> => {
    const supabase = getSupabase();

    const [members, freeResult] = await Promise.all([
      getMembers(),
      supabase
        .from("wishes")
        .select("member_id")
        .is("claimed_by", null)
        .neq("member_id", viewerId),
    ]);

    if (freeResult.error) throw freeResult.error;

    const free = tally(freeResult.data);

    return members.map((member) => toMemberSummary(member, free, viewerId));
  },
);

/** Wish rows in, wishes-per-member out. */
function tally(rows: unknown): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of (rows ?? []) as { member_id: string }[]) {
    counts.set(row.member_id, (counts.get(row.member_id) ?? 0) + 1);
  }
  return counts;
}

export const getMemberById = cache(async (id: string): Promise<Member | null> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("family_members")
    .select(MEMBER_COLUMNS)
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error) throw error;
  return data ? toMember(data as MemberRow) : null;
});

/** Everyone, approved or not — the admin's approval dialog and nothing else. */
export const getMemberAccounts = cache(async (): Promise<MemberAccount[]> => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("family_members")
    .select(`${MEMBER_COLUMNS}, status, email`)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as MemberAccountRow[]).map(toMemberAccount);
});

/**
 * How many people are waiting to be let in — a number, nothing more.
 *
 * The header badges this on every page an admin loads, and `getMemberAccounts`
 * would be the wrong tool for it: that one carries email addresses, which have
 * no business travelling with the layout. `head: true` asks Postgres for the
 * count without returning a single row.
 */
export const countPendingAccounts = cache(async (): Promise<number> => {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("family_members")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) throw error;
  return count ?? 0;
});

/**
 * Who is looking, resolved once per render.
 *
 * Two clients, on purpose: the session comes from Supabase Auth, running as the
 * visitor and able to read no table at all, and the member row is then fetched
 * with the service_role key. The link between them is `auth_user_id`, which the
 * visitor cannot influence — unlike the cookie this replaced, which was simply a
 * member id that anyone could edit to become anyone.
 */
export const getAccess = cache(async (): Promise<Access> => {
  const user = await getAuthUser();
  if (!user) return { kind: "anonymous" };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("family_members")
    .select(`${MEMBER_COLUMNS}, status`)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (error) throw error;

  const row = data as (MemberRow & { status: string }) | null;

  return resolveAccess({
    authUserId: user.id,
    member: row
      ? { ...toMember(row), status: toStatus(row.status) }
      : null,
  });
});

/**
 * The signed-in, approved member — or null.
 *
 * Every Server Action derives the caller from this, so someone still waiting for
 * approval is treated exactly like a stranger by all of them, without any of
 * them having to know that `pending` is a state that exists.
 */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const access = await getAccess();
  return access.kind === "active" ? access.member : null;
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
