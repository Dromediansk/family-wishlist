import "server-only";

import crypto from "node:crypto";
import { cache } from "react";

import { asGroupId, asMembershipId } from "@/lib/ids";
import { getSupabase } from "@/lib/supabase";
import type { GroupContext, Invite, InviteWithCreator } from "@/lib/types";

const INVITE_COLUMNS =
  "id, group_id, created_by, token, expires_at, max_uses, uses, revoked_at, created_at";

type InviteRow = {
  id: string;
  group_id: string;
  created_by: string;
  token: string;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  revoked_at: string | null;
  created_at: string;
};

function toInvite(row: InviteRow): Invite {
  return {
    id: row.id,
    groupId: asGroupId(row.group_id),
    createdBy: asMembershipId(row.created_by),
    token: row.token,
    expiresAt: row.expires_at,
    maxUses: row.max_uses,
    uses: row.uses,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Mints a fresh invite for `ctx`'s group, credited to `ctx`'s own
 * *membership* — never the account id. `invites_creator_in_group` would refuse
 * the row outright if it were the other one.
 * docs/content/groups.md#invites
 */
export async function insertInvite(ctx: GroupContext): Promise<Invite> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + ONE_DAY_MS).toISOString();

  const { data, error } = await getSupabase()
    .from("invites")
    .insert({
      group_id: ctx.groupId,
      created_by: ctx.membershipId,
      token,
      expires_at: expiresAt,
    })
    .select(INVITE_COLUMNS)
    .single();

  if (error) throw error;
  return toInvite(data as InviteRow);
}

/** The invite a token names, or null for one that never existed. */
export async function findInviteByToken(token: string): Promise<Invite | null> {
  const { data, error } = await getSupabase()
    .from("invites")
    .select(INVITE_COLUMNS)
    .eq("token", token)
    .maybeSingle();

  if (error) throw error;
  return data ? toInvite(data as InviteRow) : null;
}

/**
 * The invite an id names *inside `ctx`'s group*, or null. Used only to learn who
 * created it, before `canRevokeInvite` decides whether a revoke may proceed —
 * the scoped update that follows is the actual guard.
 *
 * The group is in the query rather than left to the caller to compare, because
 * an invite row carries its token, and a token is permission to join that
 * group. Another group's invite must not come back here at all.
 */
export async function findInviteInGroup(
  ctx: GroupContext,
  inviteId: string,
): Promise<Invite | null> {
  const { data, error } = await getSupabase()
    .from("invites")
    .select(INVITE_COLUMNS)
    .eq("id", inviteId)
    .eq("group_id", ctx.groupId)
    .maybeSingle();

  if (error) throw error;
  return data ? toInvite(data as InviteRow) : null;
}

/**
 * One more use, as a compare-and-swap: the write only lands if `uses` is
 * still what this call just read. Two joins landing in the same instant will
 * not both write the same stale count — one wins, and this returns `false`
 * to the other rather than silently letting the counter drift under the cap.
 * The read is not a pre-check standing in for the guard; `.eq("uses", current)`
 * in the update's own `WHERE` is the guard.
 */
export async function markInviteUsed(inviteId: string): Promise<boolean> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("invites")
    .select("uses")
    .eq("id", inviteId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return false;

  const current = (data as { uses: number }).uses;

  const { data: updated, error: updateError } = await supabase
    .from("invites")
    .update({ uses: current + 1 })
    .eq("id", inviteId)
    .eq("uses", current)
    .select("id");

  if (updateError) throw updateError;
  return (updated?.length ?? 0) > 0;
}

/**
 * Revokes an invite, scoped to `ctx`'s group in the update's own `WHERE`
 * clause — the predicate is the guard that actually runs, not the read the
 * caller already did to pick a refusal message. Returns whether a row matched.
 */
export async function revokeInviteRow(
  ctx: GroupContext,
  inviteId: string,
): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("group_id", ctx.groupId)
    .select("id");

  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Every invite into this group, each named by whoever made it — the admin's view
 * on `/family`, which is the only screen that lists invites at all.
 */
export const listGroupInvites = cache(
  async (ctx: GroupContext): Promise<InviteWithCreator[]> => {
    // Newest first, so a just-created link is the one on top.
    const { data, error } = await getSupabase()
      .from("invites")
      .select(INVITE_COLUMNS)
      .eq("group_id", ctx.groupId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const rows = (data ?? []) as InviteRow[];
    if (rows.length === 0) return [];

    // Every invite in this group was created by a membership in this group —
    // `invites_creator_in_group` guarantees it — so this second query never
    // misses a name.
    const { data: memberRows, error: memberError } = await getSupabase()
      .from("memberships")
      .select("id, name")
      .in(
        "id",
        rows.map((row) => row.created_by),
      );

    if (memberError) throw memberError;

    const names = new Map(
      ((memberRows ?? []) as { id: string; name: string }[]).map((row) => [
        row.id,
        row.name,
      ]),
    );

    return rows.map((row) => ({
      ...toInvite(row),
      createdByName: names.get(row.created_by) ?? "?",
    }));
  },
);
