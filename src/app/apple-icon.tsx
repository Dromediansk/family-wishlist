import { ImageResponse } from "next/og";

import { IconArtwork } from "@/lib/icon-artwork";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export const dynamic = "force-static";

/**
 * iOS home screen icon: same artwork, at the size iOS asks for and opaque — iOS
 * renders transparency as black.
 */
export default function AppleIcon() {
  return new ImageResponse(<IconArtwork size={size.width} />, { ...size });
}
