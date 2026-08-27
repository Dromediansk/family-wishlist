import { ImageResponse } from "next/og";

import { IconArtwork } from "@/lib/icon-artwork";
import { THEME_COLORS } from "@/lib/theme-colors";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** As in `icon.tsx` — the root layout's force-dynamic must not leak down here. */
export const dynamic = "force-static";

/**
 * The card a shared link unfurls into, on every service that reads Open Graph.
 *
 * **Deliberately wordless.** The name and the sentence beside this image come
 * from `metadata`, which is translated; a picture with Slovak baked into it
 * would be wrong under `/en`, and one image that is right in both languages is
 * worth more than two that have to be kept in step.
 *
 * Satori draws plain SVG rather than React components, which is why the mark
 * arrives as `IconArtwork` — the same drawing as the home-screen icon, sized to
 * a third of the card's height so it reads at thumbnail size.
 * docs/decisions/ui-patterns.md#icons
 */
export default function OpenGraphImage() {
  const mark = Math.round(size.height / 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: THEME_COLORS.backgroundLight,
        }}
      >
        {/* The tile keeps the icon's own proportions; `borderRadius` is the
            56%-ratio drawing's --radius-xl at this scale. */}
        <div
          style={{
            width: mark,
            height: mark,
            display: "flex",
            borderRadius: Math.round(mark * 0.16),
            overflow: "hidden",
          }}
        >
          <IconArtwork size={mark} />
        </div>
      </div>
    ),
    { ...size },
  );
}
