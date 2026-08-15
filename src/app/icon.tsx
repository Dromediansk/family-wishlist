import { ImageResponse } from "next/og";

import { IconArtwork } from "@/lib/icon-artwork";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/**
 * The root layout is force-dynamic, which would otherwise leak down into this
 * metadata route and rasterise the PNG on every single request. The icon never
 * varies by request, so pin it back to a build-time render.
 */
export const dynamic = "force-static";

/**
 * The installed app's icon, also used as the browser tab icon in browsers that
 * prefer it over `favicon.ico`. `manifest.ts` points at the stable `/icon`
 * path; the `?<hash>` Next appends in the <head> link is only cache-busting.
 */
export default function Icon() {
  return new ImageResponse(<IconArtwork size={size.width} />, { ...size });
}
