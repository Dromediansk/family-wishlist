/**
 * The app icon, shared by `icon.tsx` and `apple-icon.tsx`.
 *
 * The glyph is lucide's `gift` geometry inlined by hand: these routes rasterise
 * through Satori, which draws plain SVG but not React components. The 56% ratio
 * is a rule, not a number — docs/content/ui-patterns.md#icons.
 */

import { THEME_COLORS } from "@/lib/theme-colors";

export function IconArtwork({ size }: { size: number }) {
  const glyph = Math.round(size * 0.56);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: THEME_COLORS.primary,
      }}
    >
      <svg
        width={glyph}
        height={glyph}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 7v14" />
        <path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
        <path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5" />
        <rect x="3" y="7" width="18" height="4" rx="1" />
      </svg>
    </div>
  );
}
