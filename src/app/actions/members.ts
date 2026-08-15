"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { countMembers, getCurrentMember } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase";
import { writeMemberIdCookie } from "@/lib/session";
import type { ActionResult } from "@/lib/types";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(50, "Name must be 50 characters or fewer.");

const idSchema = z.uuid("Invalid member.");
const roleSchema = z.enum(["admin", "member"]);

/**
 * Server Actions are reachable by direct POST, not just through our UI, so
 * every one of them re-derives who the caller is from the cookie and checks
 * permission here. Nothing trusts an id supplied by the client.
 */
async function requireAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Pick who you are first." };
  if (current.role !== "admin") {
    return { ok: false, error: "Only an admin can manage family members." };
  }
  return { ok: true };
}

/**
 * Add a family member.
 *
 * Bootstrap: only admins may add members, but the table starts empty and there
 * is no admin yet. So when there are no members at all, the check is skipped
 * and the first member created becomes the admin. From then on the normal rule
 * applies.
 */
export async function addMember(input: {
  name: string;
  role?: "admin" | "member";
}): Promise<ActionResult> {
  const name = nameSchema.safeParse(input.name);
  if (!name.success) {
    return { ok: false, error: name.error.issues[0].message };
  }

  const existing = await countMembers();
  const isBootstrap = existing === 0;

  if (!isBootstrap) {
    const permitted = await requireAdmin();
    if (!permitted.ok) return permitted;
  }

  const role = isBootstrap ? "admin" : (input.role ?? "member");
  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { ok: false, error: "Invalid role." };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("family_members")
    .insert({ name: name.data, role: parsedRole.data })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `There is already someone called ${name.data}.` };
    }
    return { ok: false, error: error.message };
  }

  // The very first person to set the family up is signed in as themselves,
  // otherwise they'd have to pick their own name straight afterwards.
  if (isBootstrap && data) {
    await writeMemberIdCookie(data.id as string);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function renameMember(
  memberId: string,
  newName: string,
): Promise<ActionResult> {
  const permitted = await requireAdmin();
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: "Invalid member." };

  const name = nameSchema.safeParse(newName);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };

  const supabase = getSupabase();
  const { error } = await supabase
    .from("family_members")
    .update({ name: name.data })
    .eq("id", id.data);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: `There is already someone called ${name.data}.` };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setMemberRole(
  memberId: string,
  role: "admin" | "member",
): Promise<ActionResult> {
  const permitted = await requireAdmin();
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: "Invalid member." };

  const parsedRole = roleSchema.safeParse(role);
  if (!parsedRole.success) return { ok: false, error: "Invalid role." };

  const supabase = getSupabase();

  // Don't let the last admin demote themselves — that would lock everyone out
  // of member management with no way back except editing the database.
  if (parsedRole.data === "member") {
    const { count, error: countError } = await supabase
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) return { ok: false, error: countError.message };
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "There must be at least one admin." };
    }
  }

  const { error } = await supabase
    .from("family_members")
    .update({ role: parsedRole.data })
    .eq("id", id.data);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function removeMember(memberId: string): Promise<ActionResult> {
  const permitted = await requireAdmin();
  if (!permitted.ok) return permitted;

  const id = idSchema.safeParse(memberId);
  if (!id.success) return { ok: false, error: "Invalid member." };

  const supabase = getSupabase();

  // Same reasoning as above: never remove the last admin.
  const { data: target, error: targetError } = await supabase
    .from("family_members")
    .select("role")
    .eq("id", id.data)
    .maybeSingle();

  if (targetError) return { ok: false, error: targetError.message };
  if (!target) return { ok: false, error: "That family member no longer exists." };

  if (target.role === "admin") {
    const { count, error: countError } = await supabase
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if (countError) return { ok: false, error: countError.message };
    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error: "There must be at least one admin. Promote someone else first.",
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
  return { ok: true };
}
