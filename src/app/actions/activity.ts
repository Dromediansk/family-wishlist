"use server";

import { revalidatePath } from "next/cache";

import { getErrorText } from "@/i18n/errors";
import { getViewer } from "@/lib/data/access";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

/**
 * Remember that the caller has opened the bell, which is what clears the badge.
 *
 * `getViewer` rather than `enterGroup`: the feed spans every group the viewer
 * is in, and no group id comes from the client, so there is nothing here to
 * re-derive a membership for. No Zod either — it takes no input at all.
 *
 * **Deliberately no `notifyChanged`** — the same reasoning as `saveGroupNote`.
 * Marking your own bell read changes nobody else's screen, so pinging the group
 * channel would wake every member's tab to re-render identical HTML. The cost
 * is the same too: the caller's own other tabs keep their badge until one
 * reloads or navigates afresh.
 *
 * The `revalidatePath` lands underneath an open dropdown, which is safe because
 * a live-update response is merged into the running tree rather than replacing
 * it. docs/decisions/live-updates.md#how-a-tab-answers-it
 */
export async function markActivitySeen(): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) {
    const text = await getErrorText();
    return { ok: false, error: text("signInFirst") };
  }

  // The precondition is the `WHERE` clause: the caller's own id is the only
  // row this can reach, and it came from the session rather than from a form.
  const { error } = await getSupabase()
    .from("app_users")
    .update({ activity_seen_at: new Date().toISOString() })
    .eq("id", viewer.userId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
