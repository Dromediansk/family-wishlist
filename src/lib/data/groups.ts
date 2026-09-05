import "server-only";

import { cache } from "react";

import { getSupabase } from "@/lib/supabase";
import type { Viewer } from "@/lib/types";

/**
 * How many groups this account has brought into existence.
 *
 * Counted on `groups.created_by`, which holds an `app_users.id` — never a
 * membership id. Leaving a group therefore does not give the budget back.
 * docs/decisions/groups-and-invites.md#the-creation-cap
 *
 * Memoised like its siblings: the header asks on every route now, so a second
 * caller in the same render must not cost a second round trip.
 */
export const countGroupsCreatedBy = cache(
  async (viewer: Viewer): Promise<number> => {
    const { count, error } = await getSupabase()
      .from("groups")
      .select("id", { count: "exact", head: true })
      .eq("created_by", viewer.userId);

    if (error) throw error;
    return count ?? 0;
  },
);
