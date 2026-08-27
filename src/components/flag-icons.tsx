import type { Locale } from "@/i18n/config";

/**
 * The two flags the language switcher offers. Hand-drawn for the same reason
 * `google-icon.tsx` is: lucide has no flags, and the alternative — the
 * regional-indicator emoji 🇬🇧 and 🇸🇰 — renders as the bare letters "GB" and
 * "SK" on Windows, where Chrome ships no flag glyphs at all.
 *
 * Both use a 3:2 box so the pair sits at one size in the menu, and both are
 * drawn coarser than the real thing: at 20px the Slovak coat of arms and the
 * Union Jack's counterchanged saltire are below the resolution that could show
 * them. What has to survive is which flag it is.
 *
 * No size class: whoever places one sizes it, with `[&_svg]:size-5` — the menu
 * item does, and so does the landing page's link to the other language.
 */

export function FlagEn() {
  return (
    <svg viewBox="0 0 60 40" aria-hidden="true" focusable="false">
      <clipPath id="flag-en-clip">
        <rect width="60" height="40" rx="4" />
      </clipPath>
      <g clipPath="url(#flag-en-clip)">
        <rect width="60" height="40" fill="#012169" />
        <path d="M0 0 60 40M60 0 0 40" stroke="#FFF" strokeWidth="9" />
        <path d="M0 0 60 40M60 0 0 40" stroke="#C8102E" strokeWidth="4" />
        <path d="M30 0V40M0 20H60" stroke="#FFF" strokeWidth="14" />
        <path d="M30 0V40M0 20H60" stroke="#C8102E" strokeWidth="8" />
      </g>
    </svg>
  );
}

export function FlagSk() {
  return (
    <svg viewBox="0 0 60 40" aria-hidden="true" focusable="false">
      <clipPath id="flag-sk-clip">
        <rect width="60" height="40" rx="4" />
      </clipPath>
      <g clipPath="url(#flag-sk-clip)">
        <rect width="60" height="40" fill="#FFF" />
        <rect y="13.33" width="60" height="13.34" fill="#0B4EA2" />
        <rect y="26.67" width="60" height="13.33" fill="#EE1C25" />
        {/* The shield: red field, white edge, sitting left of centre. */}
        <path
          d="M13 11h13.5v10.5c0 5.9-4.4 8.7-6.75 10.1C17.4 30.2 13 27.4 13 21.5z"
          fill="#EE1C25"
          stroke="#FFF"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Three hills, then the double cross standing on them. */}
        <path
          d="M14.2 25.9c1.1-2.6 2.9-2.6 4 0 1.1-2.4 2.5-2.4 3.6 0 1.1-2.6 2.9-2.6 4 0-1.2 2.7-3.5 4.2-6 5.5-2.5-1.3-4.4-2.8-5.6-5.5z"
          fill="#0B4EA2"
        />
        <path
          d="M18.75 13.3h2v13.4h-2zM16.6 15.8h6.3v2h-6.3zM15.2 19.6h9.1v2h-9.1z"
          fill="#FFF"
        />
      </g>
    </svg>
  );
}

/**
 * Which flag stands for which language — a lookup rather than a conditional, so
 * the switcher reads the flag and the label (`LOCALE_LABELS`) the same way.
 */
export const LOCALE_FLAGS: Record<Locale, () => React.ReactNode> = {
  en: FlagEn,
  sk: FlagSk,
};
