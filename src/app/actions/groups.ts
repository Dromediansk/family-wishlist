"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getAccountName, getViewer } from "@/lib/data/access";
import { countGroupsCreatedBy } from "@/lib/data/groups";
import { MAX_GROUPS_PER_ACCOUNT } from "@/lib/groups";
import { notifyChanged } from "@/lib/realtime";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

const nameSchema = z
  .string()
  .trim()
  .min(1, "Názov skupiny je povinný.")
  .max(60, "Názov skupiny môže mať najviac 60 znakov.");

/**
 * Start a group. Whoever creates it is its admin — the only way to become one
 * without being promoted. docs/content/groups.md
 *
 * `groupId` comes back on success so the caller can land in the group it just
 * made rather than in whichever one it joined first.
 */
export async function createGroup(
  rawName: string,
): Promise<ActionResult & { groupId?: string }> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Najprv sa prihlás." };

  const name = nameSchema.safeParse(rawName);
  if (!name.success) return { ok: false, error: name.error.issues[0].message };

  // Counted on groups.created_by, so leaving a group does not give the budget
  // back. docs/content/groups.md#the-creation-cap
  if ((await countGroupsCreatedBy(viewer)) >= MAX_GROUPS_PER_ACCOUNT) {
    return {
      ok: false,
      error: `Vytvoriť môžeš najviac ${MAX_GROUPS_PER_ACCOUNT} skupín.`,
      final: true,
    };
  }

  // Read before either insert: a membership needs a name, and failing here
  // leaves nothing behind to undo.
  const memberName = await getAccountName(viewer);
  const supabase = getSupabase();

  // `created_by` is an app_users id. It is the caller's own, re-derived from the
  // session — the client sends nothing but the name.
  const { data, error } = await supabase
    .from("groups")
    .insert({ name: name.data, created_by: viewer.userId })
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return { ok: false, error: "Skupinu sa nepodarilo vytvoriť." };
  }

  const groupId = (data[0] as { id: string }).id;

  const { error: membershipError } = await supabase.from("memberships").insert({
    group_id: groupId,
    user_id: viewer.userId,
    name: memberName,
    role: "admin",
  });

  if (membershipError) {
    /*
     * A group nobody belongs to is unreachable but still counts against the cap,
     * so it goes. Scoped to a row this call just created: the id came back from
     * the insert above and `created_by` is the caller.
     */
    await supabase
      .from("groups")
      .delete()
      .eq("id", groupId)
      .eq("created_by", viewer.userId);

    return { ok: false, error: "Skupinu sa nepodarilo vytvoriť." };
  }

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true, groupId };
}
