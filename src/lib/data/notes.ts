import "server-only";

import { getSupabase } from "@/lib/supabase";
import type { GroupContext } from "@/lib/types";

/**
 * One member's private note for one group, or `""` when they have not written
 * one.
 *
 * Both halves of the key come from the context rather than from a caller: a
 * note is addressed by whoever is asking for it, so there is no id here for a
 * client to have chosen. `enterGroup` is what turned the group id in the URL
 * into the membership row this context stands on.
 *
 * Empty string rather than null: "never written" and "emptied" read the same to
 * the person looking at the page, and the form renders one value either way.
 *
 * Not `cache`d — one page calls this once.
 */
export async function getGroupNote(ctx: GroupContext): Promise<string> {
  const { data, error } = await getSupabase()
    .from("group_notes")
    .select("body")
    .eq("user_id", ctx.userId)
    .eq("group_id", ctx.groupId)
    .maybeSingle();

  if (error) throw error;

  // The client is untyped, so this is the boundary that says what was selected.
  return (data as { body: string } | null)?.body ?? "";
}
