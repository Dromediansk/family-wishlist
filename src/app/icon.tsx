import { ImageResponse } from "next/og";

import { IconArtwork } from "@/lib/icon-artwork";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** Or the root layout's force-dynamic would rasterise this PNG per request. */
export const dynamic = "force-static";

/**
 * The installed app's icon and the browser tab icon. There is deliberately no
 * `favicon.ico` — it would win the tab and this drawing would only ever be seen
 * on a home screen. docs/content/ui-patterns.md#icons
 */
export default function Icon() {
  return new ImageResponse(<IconArtwork size={size.width} />, { ...size });
}
