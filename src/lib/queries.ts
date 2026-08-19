import "server-only";

import { cache } from "react";

import { resolveAccess, type Access } from "@/lib/access";
import { sortMemberSummaries, toMemberSummary } from "@/lib/members";
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

/** `cache` dedupes within a render, so the header and the page share one trip. */
export const getMembers = cache(async (): Promise<MemberWithCount[]> => {
  const supabase = getSupabase();

  const [membersResult, wishesResult] = await Promise.all([
    supabase
      .from("family_members")
      .select(MEMBER_COLUMNS)
      // Pending people are not in the family yet — no card, no list to claim from.
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
 * their wishes are still free.
 *
 * The availability query selects no claim column and drops the viewer's own rows
 * in the `WHERE` clause, so their number is never computed.
 * docs/content/privacy-rule.md#counting-on-the-family-grid
 *
 * Separate from `getMembers` because the admin screen wants the plain total in
 * sign-up order; `sortMemberSummaries` is the sole authority on the grid's own.
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

    return sortMemberSummaries(
      members.map((member) => toMemberSummary(member, free, viewerId)),
    );
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
 * How many people are waiting — a number, nothing more. The header badges this
 * on every admin page load, and `getMemberAccounts` carries email addresses,
 * which have no business travelling with the layout.
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
 * Who is looking, resolved once per render. Two clients on purpose: the session
 * comes from Supabase Auth, the member row from service_role, and the link
 * between them is `auth_user_id`, which the visitor cannot influence.
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
 * The signed-in, approved member — or null. Every Server Action derives its
 * caller from this, so a `pending` visitor is refused by all of them without any
 * of them knowing that state exists.
 */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const access = await getAccess();
  return access.kind === "active" ? access.member : null;
});

/**
 * One member's wish list, shaped for whoever is looking. The owner branch
 * selects only the non-claim columns, so claim data never leaves the database on
 * that path. docs/content/privacy-rule.md#reading-a-list
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
    .select(`${OWNER_WISH_COLUMNS}, owner:member_id (id, name)`)
    .eq("claimed_by", memberId)
    // Newest first. Ordering needs no projection, and no date is displayed.
    .order("claimed_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as ClaimedWishRow[]).map(toClaimedWish);
}
