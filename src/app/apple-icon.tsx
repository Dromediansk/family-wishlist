import { ImageResponse } from "next/og";

import { IconArtwork } from "@/lib/icon-artwork";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export const dynamic = "force-static";

/**
 * iOS home screen icon. Same artwork as `icon.tsx`, at the size iOS asks for
 * and with an opaque background — iOS does not composite transparency and
 * renders anything see-through as black.
 */
export default function AppleIcon() {
  return new ImageResponse(<IconArtwork size={size.width} />, { ...size });
}
