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

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Mints a fresh invite for `ctx`'s group, credited to `ctx`'s own
 * *membership* — never the account id. `invites_creator_in_group` would refuse
 * the row outright if it were the other one.
 * docs/content/groups.md#invites
 */
export async function insertInvite(ctx: GroupContext): Promise<Invite> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + THIRTY_DAYS_MS).toISOString();

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
 * The invite an id names, or null. Used only to learn who created it and in
 * which group, before `canRevokeInvite` decides whether a revoke may proceed —
 * the scoped update that follows is the actual guard.
 */
export async function findInviteById(inviteId: string): Promise<Invite | null> {
  const { data, error } = await getSupabase()
    .from("invites")
    .select(INVITE_COLUMNS)
    .eq("id", inviteId)
    .maybeSingle();

  if (error) throw error;
  return data ? toInvite(data as InviteRow) : null;
}

/**
 * One more use. Not atomic — two joins landing in the same instant could both
 * read the same count — which is an acceptable risk for a handful of
 * relatives, not a queue worth defending with a database function.
 */
export async function markInviteUsed(inviteId: string): Promise<void> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("invites")
    .select("uses")
    .eq("id", inviteId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return;

  const { error: updateError } = await supabase
    .from("invites")
    .update({ uses: (data as { uses: number }).uses + 1 })
    .eq("id", inviteId);

  if (updateError) throw updateError;
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
 * A group's invites — every member's when `mine` is false (the admin's view on
 * `/family`), or just `ctx.membershipId`'s own (the grid's **Pozvať** dialog).
 * Newest first, so a just-created link is the one on top.
 */
export const listInvitesFor = cache(
  async (ctx: GroupContext, mine: boolean): Promise<InviteWithCreator[]> => {
    const supabase = getSupabase();

    const base = supabase
      .from("invites")
      .select(INVITE_COLUMNS)
      .eq("group_id", ctx.groupId);

    const scoped = mine ? base.eq("created_by", ctx.membershipId) : base;

    const { data, error } = await scoped.order("created_at", {
      ascending: false,
    });

    if (error) throw error;

    const rows = (data ?? []) as InviteRow[];
    if (rows.length === 0) return [];

    // Every invite in this group was created by a membership in this group —
    // `invites_creator_in_group` guarantees it — so this second query never
    // misses a name.
    const { data: memberRows, error: memberError } = await supabase
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
