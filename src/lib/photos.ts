import "server-only";

import { extensionFor, type PhotoMime } from "@/lib/images";
import { getSupabase } from "@/lib/supabase";

/**
 * The `wish-photos` bucket, reached only through the service_role client. The
 * bucket is private and carries no policy, exactly like every table.
 * docs/content/wishes.md#photos
 */

const PHOTO_BUCKET = "wish-photos";

function bucket() {
  return getSupabase().storage.from(PHOTO_BUCKET);
}

/**
 * Stores one photo for a wish and returns its object key. A fresh random name
 * every time: the old object is swept afterwards rather than overwritten, so a
 * reader holding the previous URL never sees the new picture under it.
 */
export async function uploadWishPhoto(
  wishId: string,
  bytes: ArrayBuffer,
  mime: PhotoMime,
): Promise<string | null> {
  const path = `${wishId}/${crypto.randomUUID()}.${extensionFor(mime)}`;

  const { error } = await bucket().upload(path, bytes, {
    contentType: mime,
    upsert: false,
  });

  if (error) {
    console.warn("Wish photo upload failed:", error);
    return null;
  }

  return path;
}

/**
 * Removes every object under a wish except `keep`.
 *
 * One helper for all three cases — a replaced photo (`keep` is the new path), a
 * cleared one and a deleted wish (`keep` is null) — because they differ only in
 * what survives. It also sweeps anything an earlier half-finished write left
 * behind, which is why the wish id is the key's prefix.
 *
 * Failures are logged, never returned: an orphaned object costs a few hundred
 * KB, and turning a write that already succeeded into an error the owner reads
 * would cost more. Same reasoning as `notifyChanged`.
 */
export async function pruneWishPhotos(
  wishId: string,
  keep: string | null,
): Promise<void> {
  try {
    const { data, error } = await bucket().list(wishId);
    if (error) throw error;

    const stale = (data ?? [])
      .map((object) => `${wishId}/${object.name}`)
      .filter((path) => path !== keep);

    if (stale.length === 0) return;

    const removal = await bucket().remove(stale);
    if (removal.error) throw removal.error;
  } catch (error) {
    console.warn("Wish photo cleanup failed:", error);
  }
}

/** Takes back one object, for a write that uploaded it and then did not land. */
export async function removeWishPhoto(path: string): Promise<void> {
  const { error } = await bucket().remove([path]);
  if (error) console.warn("Wish photo removal failed:", error);
}

/** The bytes behind a stored path, or null if the object has gone missing. */
export async function downloadWishPhoto(path: string): Promise<Blob | null> {
  const { data, error } = await bucket().download(path);

  if (error) {
    console.warn("Wish photo download failed:", error);
    return null;
  }

  return data;
}
