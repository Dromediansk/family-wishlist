"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { enterGroup, getAccountName, getViewer } from "@/lib/data/access";
import {
  findInviteById,
  findInviteByToken,
  insertInvite,
  markInviteUsed,
  revokeInviteRow,
} from "@/lib/data/invites";
import { INVITE_EXPIRED_MESSAGE, inviteUsable } from "@/lib/invites";
import { notifyChanged } from "@/lib/realtime";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";
import { canRevokeInvite } from "@/lib/visibility";

const groupIdSchema = z.uuid("Neplatná skupina.");
const inviteIdSchema = z.uuid("Neplatná pozvánka.");

/**
 * Any member may open the door. The person who wants to add a cousin is
 * usually not the admin, and needing one to be awake is a milder version of
 * the approval queue this design deleted. docs/content/groups.md#invites
 */
export async function createInvite(
  groupId: string,
): Promise<ActionResult & { token?: string }> {
  const parsedGroup = groupIdSchema.safeParse(groupId);
  if (!parsedGroup.success) {
    return { ok: false, error: parsedGroup.error.issues[0].message };
  }

  const ctx = await enterGroup(parsedGroup.data);
  if (!ctx) return { ok: false, error: "Najprv sa prihlás." };

  const invite = await insertInvite(ctx);

  revalidatePath("/", "layout");
  await notifyChanged([ctx.groupId]);
  return { ok: true, token: invite.token };
}

/**
 * A group admin may revoke any invite to their group; anybody may revoke one
 * they created themselves — `canRevokeInvite` is the single spelling of that
 * rule, and it is checked here rather than re-derived.
 * docs/content/groups.md#invites
 */
export async function revokeInvite(
  groupId: string,
  inviteId: string,
): Promise<ActionResult> {
  const parsedGroup = groupIdSchema.safeParse(groupId);
  if (!parsedGroup.success) {
    return { ok: false, error: parsedGroup.error.issues[0].message };
  }

  const ctx = await enterGroup(parsedGroup.data);
  if (!ctx) return { ok: false, error: "Najprv sa prihlás." };

  const parsedInvite = inviteIdSchema.safeParse(inviteId);
  if (!parsedInvite.success) {
    return { ok: false, error: parsedInvite.error.issues[0].message };
  }

  // A read, not a pre-check standing in for a predicate: `canRevokeInvite`
  // needs to know who created this invite before it can decide, and there is
  // no single `WHERE` that expresses both an admin's blanket "any" and a
  // member's "only mine" while still telling the two refusals apart.
  const invite = await findInviteById(parsedInvite.data);
  if (!invite || invite.groupId !== ctx.groupId) {
    return { ok: false, error: "Táto pozvánka už neexistuje." };
  }

  if (!canRevokeInvite(ctx, invite)) {
    return {
      ok: false,
      error: "Túto pozvánku môže zrušiť len jej autor alebo správca.",
    };
  }

  // The scoped update is the guard that actually runs — the read above only
  // chose which refusal to show, and could in principle be stale by now.
  const revoked = await revokeInviteRow(ctx, parsedInvite.data);
  if (!revoked) return { ok: false, error: "Táto pozvánka už neexistuje." };

  revalidatePath("/", "layout");
  await notifyChanged([ctx.groupId]);
  return { ok: true };
}

/**
 * The four-step guard, in order: usable, signed in, not already a member,
 * then in. Reachable by direct POST like any Server Action, so it re-checks
 * every one of these for itself — the route handler's own pre-check of the
 * token is only there to pick a redirect target before this runs.
 * docs/content/groups.md#invites
 */
export async function joinWithInvite(token: string): Promise<ActionResult> {
  const invite = await findInviteByToken(token);
  if (!invite || !inviteUsable(invite, new Date())) {
    return { ok: false, error: INVITE_EXPIRED_MESSAGE, final: true };
  }

  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Najprv sa prihlás." };

  // Already a member: the door is open for them, and it stays that way
  // without spending one of this link's uses.
  const already = await enterGroup(invite.groupId);
  if (already) return { ok: true };

  const name = await getAccountName(viewer);

  const { data, error } = await getSupabase()
    .from("memberships")
    .insert({
      group_id: invite.groupId,
      user_id: viewer.userId,
      name,
      role: "member",
    })
    .select("id");

  if (error || !data || data.length === 0) {
    return { ok: false, error: "Nepodarilo sa pridať do skupiny." };
  }

  // The membership row above is what actually admitted this caller — a
  // link valid the moment they opened it — so nothing past this point can
  // undo that. `markInviteUsed` is a compare-and-swap; a `false` means
  // somebody else's join incremented `uses` in between the read above and
  // this write. One retry (a fresh read, a fresh swap) closes the ordinary
  // two-way race; if it still loses, the count stays one short of exact
  // rather than the join being refused for a caller already in the group.
  if (!(await markInviteUsed(invite.id))) {
    await markInviteUsed(invite.id);
  }

  revalidatePath("/", "layout");
  await notifyChanged([invite.groupId]);
  return { ok: true };
}
