"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentMember } from "@/lib/queries";
import { notifyChanged } from "@/lib/realtime";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";
import { refusalFor } from "@/lib/wishes";

const idSchema = z.uuid("Neplatné želanie.");

/** Empty optional fields arrive from forms as "" — treat those as absent. */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} môže mať najviac ${max} znakov.`)
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();

const wishInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Názov je povinný.")
    .max(120, "Názov môže mať najviac 120 znakov."),
  description: optionalText(1000, "Popis"),
  url: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional()
    .refine(
      (value) =>
        value == null || /^https?:\/\/\S+$/i.test(value),
      "Odkaz musí začínať na http:// alebo https://",
    ),
});

export type WishInput = z.input<typeof wishInputSchema>;

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Toto nevyzerá správne.";
}

/**
 * Work out what to tell an owner whose delete or edit matched no rows.
 *
 * The read happens only *after* the write missed. The conditional WHERE clause
 * is what enforces the refusal; this decides nothing but which sentence to
 * show, so a claim landing in between can at worst pick the wrong wording.
 *
 * This is the one owner-serving path that looks at `claimed_by`. It stays here,
 * inside the action — never in OWNER_WISH_COLUMNS, getWishListFor or OwnerWish
 * — and the value itself never leaves this function.
 */
async function lookUpRefusal(
  wishId: string,
  ownerId: string,
  operation: "delete" | "update",
): Promise<ActionResult> {
  const { data } = await getSupabase()
    .from("wishes")
    .select("claimed_by")
    .eq("id", wishId)
    .eq("member_id", ownerId)
    .maybeSingle();

  return { ok: false, ...refusalFor(data, operation) };
}

/** Add a wish to your OWN list. The owner is always the caller. */
export async function addWish(input: WishInput): Promise<ActionResult> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Najprv si vyber, kto si." };

  const parsed = wishInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = getSupabase();
  const { error } = await supabase.from("wishes").insert({
    member_id: current.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    url: parsed.data.url ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}

/**
 * Rewrite a wish on your own list — unless somebody has already reserved it,
 * in which case the owner is refused and told so, without being told by whom.
 */
export async function updateWish(
  wishId: string,
  input: WishInput,
): Promise<ActionResult> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Najprv si vyber, kto si." };

  const id = idSchema.safeParse(wishId);
  if (!id.success) return { ok: false, error: "Neplatné želanie." };

  const parsed = wishInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .update({
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      url: parsed.data.url ?? null,
    })
    // Ownership is part of the WHERE clause, so someone else's wish simply
    // doesn't match rather than relying on a separate check. `claimed_by is
    // null` joins it for the same reason: a wish somebody has reserved is not
    // the owner's to rewrite, and putting that in the predicate means a claim
    // landing a moment before this update stops it rather than racing it.
    .eq("id", id.data)
    .eq("member_id", current.id)
    .is("claimed_by", null)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return lookUpRefusal(id.data, current.id, "update");
  }

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}

/** Remove a wish from your own list. Refused once it has been reserved. */
export async function deleteWish(wishId: string): Promise<ActionResult> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Najprv si vyber, kto si." };

  const id = idSchema.safeParse(wishId);
  if (!id.success) return { ok: false, error: "Neplatné želanie." };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .delete()
    // Same two guards as updateWish, and the reserved one matters more here:
    // a hard delete would leave the buyer holding a wish that no longer exists.
    .eq("id", id.data)
    .eq("member_id", current.id)
    .is("claimed_by", null)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return lookUpRefusal(id.data, current.id, "delete");
  }

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}

/**
 * Claim someone else's wish.
 *
 * `claimed_by is null` is part of the WHERE clause so two people clicking at
 * the same moment can't both win — the second update matches no rows.
 */
export async function claimWish(wishId: string): Promise<ActionResult> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Najprv si vyber, kto si." };

  const id = idSchema.safeParse(wishId);
  if (!id.success) return { ok: false, error: "Neplatné želanie." };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .update({ claimed_by: current.id, claimed_at: new Date().toISOString() })
    .eq("id", id.data)
    .is("claimed_by", null)
    .neq("member_id", current.id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    // Final for the same reason the owner's refusal is: pressing the button
    // again cannot un-reserve it.
    return {
      ok: false,
      error: "Niekto bol rýchlejší — táto položka je už rezervovaná.",
      final: true,
    };
  }

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}

/** Release a wish you claimed, so someone else can take it. */
export async function unclaimWish(wishId: string): Promise<ActionResult> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Najprv si vyber, kto si." };

  const id = idSchema.safeParse(wishId);
  if (!id.success) return { ok: false, error: "Neplatné želanie." };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .update({ claimed_by: null, claimed_at: null })
    .eq("id", id.data)
    .eq("claimed_by", current.id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return {
      ok: false,
      error: "Uvoľniť môžeš len vlastné rezervácie.",
      final: true,
    };
  }

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}
