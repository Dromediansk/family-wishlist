/**
 * The handful of theme colours that have to exist outside CSS.
 *
 * globals.css defines everything in oklch(), which is fine for the stylesheet
 * but not for a web app manifest or a <meta name="theme-color">, and not for
 * Satori when it rasterises the app icon. These are the same tokens converted
 * to sRGB — keep them in step with globals.css by hand.
 */
export const THEME_COLORS = {
  /** `--background` in `:root` */
  backgroundLight: "#fdfcf8",
  /** `--background` under `prefers-color-scheme: dark` */
  backgroundDark: "#0f111a",
  /** `--primary` in `:root` */
  primary: "#008039",
} as const;
