"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCurrentMember } from "@/lib/queries";
import { notifyChanged } from "@/lib/realtime";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

const idSchema = z.uuid("Neplatné upozornenie.");

/**
 * Acknowledge a notice: the buyer has seen that their gift was cancelled or
 * changed, and does not need telling again.
 *
 * For a cancelled wish this is the end of the story — the wish itself was
 * deleted when the owner deleted it, so removing the notice removes the last
 * trace. For an edited one the wish stays claimed and only the "this changed"
 * banner goes; releasing the claim is a separate button.
 */
export async function dismissNotice(noticeId: string): Promise<ActionResult> {
  const current = await getCurrentMember();
  if (!current) return { ok: false, error: "Najprv sa prihlás." };

  const id = idSchema.safeParse(noticeId);
  if (!id.success) return { ok: false, error: "Neplatné upozornenie." };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("claim_notices")
    .delete()
    // Addressed-to is part of the WHERE clause, so somebody else's notice
    // simply doesn't match rather than relying on a separate check.
    .eq("id", id.data)
    .eq("claimer_id", current.id)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Toto upozornenie už neexistuje." };
  }

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}
