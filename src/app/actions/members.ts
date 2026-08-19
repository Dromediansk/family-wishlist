"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { isAdmin } from "@/lib/access";
import { pruneWishPhotos } from "@/lib/photos";
import { getCurrentMember } from "@/lib/queries";
import { notifyChanged } from "@/lib/realtime";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Meno je povinné.")
  .max(50, "Meno môže mať najviac 50 znakov.");

const idSchema = z.uuid("Neplatný člen.");
const roleSchema = z.enum(["admin", "member"]);

/**
 * Server Actions are reachable by direct POST, so every one re-derives its
 * caller from the session. Nothing trusts a client-supplied id, and
 * `getCurrentMember()` returns only approved members.
 */
async function requireAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Najprv sa prihlás." };
  if (!isAdmin(current)) {
    return { ok: false, error: "Členov rodiny môže spravovať len správca." };
  }
  return { ok: true };
}

/**
 * Let someone in. Members are created by a database trigger on sign-in, as
 * `pending`; this is the door, and the only thing between a stranger who found
 * the link and the family. docs/content/membership.md
 */
export async function approveMember(memberId: string): Promise<ActionResult> {
  const permitted = await requireAdmin();
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: "Neplatný člen." };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("family_members")
    .update({ status: "active" })
    .eq("id", id.data)
    .eq("status", "pending")
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Tento človek už nečaká na schválenie." };
  }

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}

/**
 * Turn someone away. Their Google account survives, so signing in again puts
 * them back in the queue — rejecting is a "not today", not a ban.
 * docs/content/membership.md#rejecting-vs-removing
 */
export async function rejectMember(memberId: string): Promise<ActionResult> {
  const permitted = await requireAdmin();
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: "Neplatný člen." };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("family_members")
    .delete()
    // Never touch an approved member here — that is removeMember's job, and only
    // it enforces the last-admin rule.
    .eq("id", id.data)
    .eq("status", "pending")
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Tento človek už nečaká na schválenie." };
  }

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}

export async function renameMember(
  memberId: string,
  newName: string,
): Promise<ActionResult> {
  const permitted = await requireAdmin();
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: "Neplatný člen." };

  const name = nameSchema.safeParse(newName);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };

  const supabase = getSupabase();
  // Names are not unique: identity is auth_user_id, this is a label on a card.
  const { error } = await supabase
    .from("family_members")
    .update({ name: name.data })
    .eq("id", id.data);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}

export async function setMemberRole(
  memberId: string,
  role: "admin" | "member",
): Promise<ActionResult> {
  const permitted = await requireAdmin();
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: "Neplatný člen." };

  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { ok: false, error: "Neplatná rola." };

  const supabase = getSupabase();

  // The last admin cannot be demoted, or nobody can ever approve anybody again.
  if (parsedRole.data === "member") {
    const { count, error: countError } = await supabase
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      // A pending admin cannot let anyone in, so they do not count as cover.
      .eq("status", "active");

    if (countError) return { ok: false, error: countError.message };
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "Musí existovať aspoň jeden správca." };
    }
  }

  const { error } = await supabase
    .from("family_members")
    .update({ role: parsedRole.data })
    .eq("id", id.data);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  const permitted = await requireAdmin();
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: "Neplatný člen." };

  const supabase = getSupabase();

  // Same reasoning as above: never remove the last admin.
  const { data: target, error: targetError } = await supabase
    .from("family_members")
    .select("role")
    .eq("id", id.data)
    .maybeSingle();

  if (targetError) return { ok: false, error: targetError.message };
  if (!target) return { ok: false, error: "Tento člen rodiny už neexistuje." };

  if (target.role === "admin") {
    const { count, error: countError } = await supabase
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      // A pending admin cannot let anyone in, so they do not count as cover.
      .eq("status", "active");

    if (countError) return { ok: false, error: countError.message };
    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error: "Musí existovať aspoň jeden správca. Najprv povýš niekoho iného.",
      };
    }
  }

  /*
   * Which wishes are about to cascade away, collected while their rows still
   * exist — nothing in Storage cascades. This is not a permission check: the
   * guard is the delete's own predicate below, unchanged.
   */
  const { data: doomed } = await supabase
    .from("wishes")
    .select("id")
    .eq("member_id", id.data);

  // Wishes cascade away; their claims on other lists are released by
  // ON DELETE SET NULL. docs/content/membership.md#removing-someone
  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", id.data);

  if (error) return { ok: false, error: error.message };

  // One prefix listing per wish, all at once — a member with a long list would
  // otherwise pay for them one after another.
  await Promise.all(
    ((doomed ?? []) as { id: string }[]).map((wish) =>
      pruneWishPhotos(wish.id, null),
    ),
  );

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}
