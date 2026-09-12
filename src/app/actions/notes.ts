"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { firstIssue, getErrorText } from "@/i18n/errors";
import { requireGroup } from "@/lib/data/access";
import { NOTE_MAX_LENGTH, normaliseNote } from "@/lib/notes";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";

// A message key, not a sentence: a schema is built before any request has a
// language. docs/decisions/language.md
const bodySchema = z.string().max(NOTE_MAX_LENGTH, "noteTooLong");

/**
 * Writes the caller's own note for one group.
 *
 * Not admin-only: every member keeps their own. `requireGroup` rather than
 * `getViewer` because the note is group-scoped — the group id in the call is a
 * claim, and the membership row it returns is the proof. Both halves of the key
 * written below come from that row, so there is nothing here a caller could
 * point at somebody else's note.
 *
 * **Deliberately no `notifyChanged`** — the third exception to the Server
 * Action checklist in CLAUDE.md, after `syncFromLive` and `setLocale`. Nobody
 * else's screen changes when a private note is saved, so pinging the group
 * channel would wake every member's tab to re-render identical HTML. The cost
 * is that the author's own second tab catches up on focus rather than at once.
 */
export async function saveGroupNote(
  groupId: string,
  body: string,
): Promise<ActionResult> {
  const permitted = await requireGroup(groupId);
  if (!permitted.ok) return permitted;

  const text = await getErrorText();

  // Normalised before it is measured, so the length refused is the length
  // stored — a textarea's CRLF would otherwise count twice per line.
  const parsed = bodySchema.safeParse(normaliseNote(body));
  if (!parsed.success) {
    const issue = firstIssue(parsed.error);
    return { ok: false, error: text(issue.key, issue.params) };
  }

  const { ctx } = permitted;
  const supabase = getSupabase();

  /*
   * The primary key is the precondition, so neither branch needs a preceding
   * read: the upsert writes the caller's own row or creates it, and the delete
   * of a note that was never written is a no-op that already leaves the table
   * in the state being asked for. An emptied note is a missing row rather than
   * an empty one, so "no note" is one state here and not two.
   */
  const { error } =
    parsed.data === ""
      ? await supabase
          .from("group_notes")
          .delete()
          .eq("user_id", ctx.userId)
          .eq("group_id", ctx.groupId)
      : await supabase.from("group_notes").upsert(
          {
            user_id: ctx.userId,
            group_id: ctx.groupId,
            body: parsed.data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,group_id" },
        );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
