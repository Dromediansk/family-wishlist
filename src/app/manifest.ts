import type { MetadataRoute } from "next";

import { THEME_COLORS } from "@/lib/theme-colors";

/** As in `icon.tsx` — the root layout's force-dynamic must not leak down here. */
export const dynamic = "force-static";

/**
 * Makes the app installable. `short_name` is what sits under the home-screen
 * icon, so it must stay short enough that iOS does not truncate it.
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
    // Both entries are the same route — one drawing works masked and unmasked.
    // Next's Manifest type takes one purpose per entry, hence the pair.
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
