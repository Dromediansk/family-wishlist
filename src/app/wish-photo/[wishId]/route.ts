import { z } from "zod";

import { contentTypeFor } from "@/lib/images";
import { downloadWishPhoto } from "@/lib/photos";
import { getCurrentMember } from "@/lib/queries";
import { getSupabase } from "@/lib/supabase";

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
  // The caller is re-derived here exactly as a Server Action does it, and only
  // an approved member gets an answer.
  const current = await getCurrentMember();
  if (!current) return notFound();

  const id = idSchema.safeParse((await params).wishId);
  if (!id.success) return notFound();

  /*
   * An owner reads their own list through this route too, so it is one of the
   * owner-serving paths: it selects the photo path and nothing else, and never
   * `claimed_by`. docs/content/privacy-rule.md#where-the-rule-is-enforced
   */
  const { data, error } = await getSupabase()
    .from("wishes")
    .select("photo_path")
    .eq("id", id.data)
    .maybeSingle();

  if (error) throw error;

  const path = (data as { photo_path: string | null } | null)?.photo_path;
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
