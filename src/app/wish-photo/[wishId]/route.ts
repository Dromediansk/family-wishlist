import { z } from "zod";

import { getViewer } from "@/lib/data/access";
import { getWishPhotoPath } from "@/lib/data/wishes";
import { contentTypeFor } from "@/lib/images";
import { downloadWishPhoto } from "@/lib/photos";

/**
 * A wish's photo. The bucket is private, so this is the only way to see one.
 *
 * Every answer is 404 — not 403 — because the alternative tells a stranger
 * which wish ids exist. `src/proxy.ts` already turns a signed-out visitor away
 * before they arrive; that is the shortcut, and this is the defence.
 *
 * docs/content/wishes.md#photos
 */

const idSchema = z.uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ wishId: string }> },
) {
  // The caller is re-derived here exactly as a Server Action does it.
  const viewer = await getViewer();
  if (!viewer) return notFound();

  const id = idSchema.safeParse((await params).wishId);
  if (!id.success) return notFound();

  /*
   * `getWishPhotoPath` refuses a wish whose owner shares no group with the
   * caller, and every refusal here is the same 404 as a missing photo.
   * docs/content/privacy-rule.md#serving-a-photo
   */
  const path = await getWishPhotoPath(viewer, id.data);
  if (!path) return notFound();

  // From the whitelist, never echoed from the stored path — the header can only
  // ever be one of three image types.
  const contentType = contentTypeFor(path);
  if (!contentType) return notFound();

  const blob = await downloadWishPhoto(path);
  if (!blob) return notFound();

  return new Response(blob, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      /*
       * A year, because the URL carries a `?v=` token taken from the file name
       * and every upload writes a new one. A replaced photo is a different URL,
       * so nothing cached can go stale. `private` keeps it in the one browser
       * that was allowed to see it and out of any shared cache.
       */
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}

function notFound(): Response {
  return new Response(null, { status: 404 });
}
