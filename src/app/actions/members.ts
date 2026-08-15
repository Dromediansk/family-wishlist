"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

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
 * Server Actions are reachable by direct POST, not just through our UI, so
 * every one of them re-derives who the caller is from their session and checks
 * permission here. Nothing trusts an id supplied by the client.
 *
 * getCurrentMember() only ever returns an approved member, so somebody still
 * waiting at the door fails this the same way a stranger does.
 */
async function requireAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Najprv sa prihlás." };
  if (current.role !== "admin") {
    return { ok: false, error: "Členov rodiny môže spravovať len správca." };
  }
  return { ok: true };
}

/**
 * Let someone in.
 *
 * Members are not created here — signing in with Google creates them, as
 * `pending` (see supabase/migrations/0003_auth.sql). This is the step that turns
 * a stranger who found the link into a member of the family, and it is the only
 * thing standing between the two, because Supabase will let any Google account
 * in the world finish the sign-in flow.
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
 * Turn someone away.
 *
 * Deletes the family_members row, which is what the app goes by. Their Google
 * account still exists in Supabase Auth, so signing in again puts them back in
 * the queue — the database recreates the row on insert only, and this is not an
 * insert. To bar someone for good, delete the user under Authentication in the
 * Supabase dashboard; that cascades back to here.
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
    // Never let this path touch an approved member. Removing one of those is
    // removeMember's job, which checks that the last admin cannot be deleted.
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
  // Names stopped being unique in 0003_auth.sql — they come from Google
  // profiles now, and two people really can share one. This is a label on a
  // card; identity is the linked account.
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

  // Don't let the last admin demote themselves — that would lock everyone out
  // of member management with no way back except editing the database.
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

  // Their own wishes cascade away; any claims they had made on other people's
  // lists are released back to unclaimed by the ON DELETE SET NULL rule.
  const { error } = await supabase
    .from("family_members")
    .delete()
    .eq("id", id.data);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}
