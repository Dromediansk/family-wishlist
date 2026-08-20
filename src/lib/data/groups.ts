import "server-only";

import { getSupabase } from "@/lib/supabase";
import type { Viewer } from "@/lib/types";

/**
 * How many groups this account has brought into existence.
 *
 * Counted on `groups.created_by`, which holds an `app_users.id` — never a
 * membership id. Leaving a group therefore does not give the budget back.
 * docs/content/groups.md#the-creation-cap
 */
export async function countGroupsCreatedBy(viewer: Viewer): Promise<number> {
  const { count, error } = await getSupabase()
    .from("groups")
    .select("id", { count: "exact", head: true })
    .eq("created_by", viewer.userId);

  if (error) throw error;
  return count ?? 0;
}
