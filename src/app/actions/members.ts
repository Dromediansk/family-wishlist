"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isGroupAdmin } from "@/lib/access";
import { enterGroup } from "@/lib/data/access";
import { notifyChanged } from "@/lib/realtime";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult, GroupContext } from "@/lib/types";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Meno je povinné.")
  .max(50, "Meno môže mať najviac 50 znakov.");

const idSchema = z.uuid("Neplatný člen.");
const roleSchema = z.enum(["admin", "member"]);

/**
 * Server Actions are reachable by direct POST, so every one re-derives its
 * caller *and* their standing in the group they are acting on. A group id from
 * the client is a claim; the membership row is the proof.
 */
async function requireGroupAdmin(
  groupId: string,
): Promise<{ ok: true; ctx: GroupContext } | { ok: false; error: string }> {
  const parsed = z.uuid().safeParse(groupId);
  if (!parsed.success) return { ok: false, error: "Neplatná skupina." };

  const ctx = await enterGroup(parsed.data);
  if (!ctx) return { ok: false, error: "Najprv sa prihlás." };
  if (!isGroupAdmin(ctx)) {
    return { ok: false, error: "Členov skupiny môže spravovať len správca." };
  }
  return { ok: true, ctx };
}

export async function renameMember(
  groupId: string,
  membershipId: string,
  newName: string,
): Promise<ActionResult> {
  const permitted = await requireGroupAdmin(groupId);
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(membershipId);
  if (!id.success) return { ok: false, error: "Neplatný člen." };

  const name = nameSchema.safeParse(newName);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };

  const supabase = getSupabase();
  // Names are not unique: identity is the membership row, this is a label on
  // a card.
  const { data, error } = await supabase
    .from("memberships")
    .update({ name: name.data })
    .eq("id", id.data)
    .eq("group_id", permitted.ctx.groupId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Tento člen už neexistuje." };
  }

  revalidatePath("/", "layout");
  await notifyChanged([permitted.ctx.groupId]);
  return { ok: true };
}

export async function setMemberRole(
  groupId: string,
  membershipId: string,
  role: "admin" | "member",
): Promise<ActionResult> {
  const permitted = await requireGroupAdmin(groupId);
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(membershipId);
  if (!id.success) return { ok: false, error: "Neplatný člen." };

  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { ok: false, error: "Neplatná rola." };

  const supabase = getSupabase();

  // The last admin cannot be demoted, or nobody can ever manage this group
  // again. Scoped to this group — an admin elsewhere is not cover.
  if (parsedRole.data === "member") {
    const { count, error: countError } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("group_id", permitted.ctx.groupId)
      .eq("role", "admin");

    if (countError) return { ok: false, error: countError.message };
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "Musí existovať aspoň jeden správca." };
    }
  }

  const { data, error } = await supabase
    .from("memberships")
    .update({ role: parsedRole.data })
    .eq("id", id.data)
    .eq("group_id", permitted.ctx.groupId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Tento člen už neexistuje." };
  }

  revalidatePath("/", "layout");
  await notifyChanged([permitted.ctx.groupId]);
  return { ok: true };
}

export async function removeMember(
  groupId: string,
  membershipId: string,
): Promise<ActionResult> {
  const permitted = await requireGroupAdmin(groupId);
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(membershipId);
  if (!id.success) return { ok: false, error: "Neplatný člen." };

  const supabase = getSupabase();

  // Same reasoning as above: never remove the last admin.
  const { data: target, error: targetError } = await supabase
    .from("memberships")
    .select("role")
    .eq("id", id.data)
    .eq("group_id", permitted.ctx.groupId)
    .maybeSingle();

  if (targetError) return { ok: false, error: targetError.message };
  if (!target) return { ok: false, error: "Tento člen už neexistuje." };

  if (target.role === "admin") {
    const { count, error: countError } = await supabase
      .from("memberships")
      .select("id", { count: "exact", head: true })
      .eq("group_id", permitted.ctx.groupId)
      .eq("role", "admin");

    if (countError) return { ok: false, error: countError.message };
    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error: "Musí existovať aspoň jeden správca. Najprv povýš niekoho iného.",
      };
    }
  }

  // Only the membership goes. Their wishes belong to them, not to this group,
  // and other groups may still be reading them — so nothing cascades and no
  // photo is pruned. memberships_release_claims releases the claims that this
  // group made possible, in both directions.
  // docs/content/groups.md#removing-somebody
  const { data, error } = await supabase
    .from("memberships")
    .delete()
    .eq("id", id.data)
    .eq("group_id", permitted.ctx.groupId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Tento člen už neexistuje." };
  }

  revalidatePath("/", "layout");
  await notifyChanged([permitted.ctx.groupId]);
  return { ok: true };
}
