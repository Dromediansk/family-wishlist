/**
 * The three globals.css tokens that also have to exist outside CSS, in sRGB —
 * manifests, <meta name="theme-color"> and Satori cannot take oklch(). Keep
 * them in step with globals.css by hand.
 */
export const THEME_COLORS = {
  /** `--background` in `:root` */
  backgroundLight: "#fdfcf8",
  /** `--background` under `prefers-color-scheme: dark` */
  backgroundDark: "#0f111a",
  /** `--primary` in `:root` */
  primary: "#008039",
} as const;
