import type { MetadataRoute } from "next";

import { THEME_COLORS } from "@/lib/theme-colors";

/** See the note in `icon.tsx` — the root layout's force-dynamic would otherwise apply. */
export const dynamic = "force-static";

/**
 * Makes the app installable to a phone's home screen.
 *
 * `short_name` is what ends up under the icon on the home screen, so it has to
 * stay short enough that iOS doesn't truncate it. Colours come from
 * globals.css, converted from oklch() to sRGB because manifests only take
 * plain colour values.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    lang: "sk",
    name: "Rodinný zoznam želaní",
    short_name: "Želania",
    description: "Čo by si kto želal a kto potichu kupuje čo.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: THEME_COLORS.backgroundLight,
    theme_color: THEME_COLORS.primary,
    // Both entries are the same `icon.tsx` route: the background is full-bleed
    // and the glyph sits inside the adaptive-icon safe zone, so one drawing
    // works masked and unmasked. Next's Manifest type takes one purpose per
    // entry, hence the pair.
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
