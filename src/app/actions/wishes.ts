"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getViewer } from "@/lib/data/access";
import { getWishOwner } from "@/lib/data/wishes";
import type { UserId } from "@/lib/ids";
import { MAX_PHOTO_BYTES, sniffImageType } from "@/lib/images";
import {
  pruneWishPhotos,
  removeWishPhoto,
  uploadWishPhoto,
} from "@/lib/photos";
import { notifyChanged } from "@/lib/realtime";
import { getSupabase } from "@/lib/supabase";
import type { ActionResult } from "@/lib/types";
import { canReadList } from "@/lib/visibility";
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

/**
 * What to do with the photo. Three cases rather than a nullable file, because
 * an edit has to be able to say "leave it alone" and "take it away" separately —
 * a form that sends no file is not asking for the old one to be removed.
 */
const photoSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unchanged") }),
  z.object({ kind: z.literal("clear") }),
  z.object({
    kind: z.literal("set"),
    file: z
      .instanceof(Blob, { message: "Fotku sa nepodarilo načítať." })
      .refine((file) => file.size > 0, "Fotku sa nepodarilo načítať.")
      .refine(
        (file) => file.size <= MAX_PHOTO_BYTES,
        "Fotka môže mať najviac 2 MB.",
      ),
  }),
]);

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
  photo: photoSchema.optional().default({ kind: "unchanged" }),
});

export type WishInput = z.input<typeof wishInputSchema>;

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Toto nevyzerá správne.";
}

/**
 * What to tell an owner whose delete or edit matched no rows. Runs only *after*
 * the write missed — the conditional WHERE clause is what enforces the refusal,
 * so a claim landing in between can at worst pick the wrong wording.
 *
 * The one owner-serving path allowed to select `claimed_by_user_id`. It stays
 * in this function and never migrates into OWNER_WISH_COLUMNS, getWishListFor
 * or OwnerWish. docs/content/privacy-rule.md#how-the-refusal-works
 */
async function lookUpRefusal(
  wishId: string,
  ownerId: UserId,
  operation: "delete" | "update",
): Promise<ActionResult> {
  const { data } = await getSupabase()
    .from("wishes")
    .select("claimed_by_user_id")
    .eq("id", wishId)
    .eq("owner_user_id", ownerId)
    .maybeSingle();

  return { ok: false, ...refusalFor(data, operation) };
}

/**
 * Stores the picture and points the wish at it — always as a second step, after
 * the row itself is safely written.
 *
 * That order is what keeps both halves honest: an upload that fails costs the
 * photo and not the wish, and an edit that is refused because somebody reserved
 * the wish a moment earlier has uploaded nothing to leave lying around.
 */
async function attachPhoto(
  wishId: string,
  ownerId: UserId,
  intent: z.output<typeof photoSchema>,
): Promise<ActionResult> {
  if (intent.kind === "unchanged") return { ok: true };

  let path: string | null = null;

  if (intent.kind === "set") {
    const bytes = await intent.file.arrayBuffer();

    // What the browser called it is a claim, not evidence — this action is
    // reachable by direct POST. The bytes decide.
    const mime = sniffImageType(new Uint8Array(bytes));
    if (!mime) {
      return {
        ok: false,
        error: "Fotka musí byť obrázok (JPEG, PNG alebo WebP).",
      };
    }

    path = await uploadWishPhoto(wishId, bytes, mime);
    if (!path) return { ok: false, error: "Fotku sa nepodarilo uložiť." };
  }

  const { data, error } = await getSupabase()
    .from("wishes")
    .update({ photo_path: path })
    // The same three guards as any other write. Ownership has already matched
    // once; the reservation has not, and a claim can land in between.
    .eq("id", wishId)
    .eq("owner_user_id", ownerId)
    .is("claimed_by_user_id", null)
    .select("id");

  if (error || !data || data.length === 0) {
    // Nothing was pointed at it, so take the upload back rather than letting a
    // prune that keeps the *current* photo sweep the wrong one later.
    if (path) await removeWishPhoto(path);
    return { ok: false, error: "Fotku sa nepodarilo uložiť." };
  }

  // Whatever hung there before, plus anything an earlier attempt left behind.
  await pruneWishPhotos(wishId, path);
  return { ok: true };
}

/** Add a wish to your OWN list. The owner is always the caller. */
export async function addWish(input: WishInput): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Najprv si vyber, kto si." };

  const parsed = wishInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: firstIssue(parsed.error) };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .insert({
      owner_user_id: viewer.userId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      url: parsed.data.url ?? null,
    })
    // The id comes back because a photo is stored under it: the wish has to
    // exist before its picture has anywhere to go. `single` means a row that
    // did not land is an error rather than a silent skip.
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  const { id: wishId } = data as { id: string };
  const photo = await attachPhoto(wishId, viewer.userId, parsed.data.photo);

  revalidatePath("/", "layout");
  await notifyChanged();

  if (!photo.ok) {
    // The wish is already saved — pressing the button again would add a second
    // one, so the dialog stops offering it.
    // docs/content/ui-patterns.md#a-refusal-ends-the-dialog
    return {
      ok: false,
      error: `${photo.error} Želanie je uložené bez nej.`,
      final: true,
    };
  }

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
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Najprv si vyber, kto si." };

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
    // Both guards are in the predicate, never a read-then-write: someone else's
    // wish does not match, and neither does one a claim has just landed on.
    .eq("id", id.data)
    .eq("owner_user_id", viewer.userId)
    .is("claimed_by_user_id", null)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return lookUpRefusal(id.data, viewer.userId, "update");
  }

  const photo = await attachPhoto(id.data, viewer.userId, parsed.data.photo);

  revalidatePath("/", "layout");
  await notifyChanged();

  // Not final: the text is saved, and picking a different picture can still
  // work. Pressing save again is harmless — an edit is idempotent.
  return photo;
}

/** Remove a wish from your own list. Refused once it has been reserved. */
export async function deleteWish(wishId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Najprv si vyber, kto si." };

  const id = idSchema.safeParse(wishId);
  if (!id.success) return { ok: false, error: "Neplatné želanie." };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .delete()
    // Same two guards as updateWish. The reserved one matters more here: a hard
    // delete would leave the buyer holding a wish that no longer exists.
    .eq("id", id.data)
    .eq("owner_user_id", viewer.userId)
    .is("claimed_by_user_id", null)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    return lookUpRefusal(id.data, viewer.userId, "delete");
  }

  // The row is gone, so nothing points at the picture any more.
  await pruneWishPhotos(id.data, null);

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}

/**
 * Claim someone else's wish. `claimed_by_user_id is null` sits in the WHERE
 * clause, so two people clicking at once cannot both win.
 * docs/content/claiming.md
 */
export async function claimWish(wishId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Najprv si vyber, kto si." };

  const id = idSchema.safeParse(wishId);
  if (!id.success) return { ok: false, error: "Neplatné želanie." };

  /*
   * Which list this wish is on decides whether this viewer may touch it at all.
   * The database backstops it — wishes_check_claim_peer rejects a claim between
   * strangers whatever happens here — but a refusal is better than an exception.
   */
  const ownerId = await getWishOwner(viewer, id.data);
  if (!ownerId || !canReadList(viewer.peers, ownerId)) {
    return { ok: false, error: "Toto želanie neexistuje.", final: true };
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .update({
      claimed_by_user_id: viewer.userId,
      claimed_at: new Date().toISOString(),
    })
    .eq("id", id.data)
    .is("claimed_by_user_id", null)
    .neq("owner_user_id", viewer.userId)
    .select("id");

  if (error) return { ok: false, error: error.message };
  if (!data || data.length === 0) {
    // Final: pressing the button again cannot un-reserve it.
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
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Najprv si vyber, kto si." };

  const id = idSchema.safeParse(wishId);
  if (!id.success) return { ok: false, error: "Neplatné želanie." };

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("wishes")
    .update({ claimed_by_user_id: null, claimed_at: null })
    .eq("id", id.data)
    .eq("claimed_by_user_id", viewer.userId)
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

/**
 * Mark a wish you reserved as handed over. One way: the wish leaves the owner's
 * list for good, and the record — including your name — becomes visible to
 * them. docs/content/privacy-rule.md#when-the-secret-ends
 *
 * The whole guard is `claimed_by_user_id = p_giver_id` inside `fulfil_wish`,
 * which deletes the wish and writes the record in one statement. No pre-check
 * read, and no way for the pair to half-happen.
 */
export async function fulfilWish(wishId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Najprv si vyber, kto si." };

  const id = idSchema.safeParse(wishId);
  if (!id.success) return { ok: false, error: "Neplatné želanie." };

  const { data, error } = await getSupabase().rpc("fulfil_wish", {
    p_wish_id: id.data,
    p_giver_id: viewer.userId,
  });

  if (error) return { ok: false, error: error.message };
  if (!data) {
    // Final: the wish is gone, so pressing again cannot make this work.
    return { ok: false, error: "Toto už nemáš rezervované.", final: true };
  }

  // `fulfil_wish` deletes the wish in SQL, which Storage knows nothing about,
  // so the sweep that `deleteWish` does has to happen here too. The history row
  // carries no photo.
  await pruneWishPhotos(id.data, null);

  revalidatePath("/", "layout");
  await notifyChanged();
  return { ok: true };
}
