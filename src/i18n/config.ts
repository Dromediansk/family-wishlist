/**
 * Which languages exist, how a first-time visitor's is guessed, and where the
 * answer is kept. Imported from both halves of the app, so nothing here may
 * touch `next/headers` or the database.
 *
 * The locale rides in a cookie rather than in the URL.
 * docs/decisions/language.md
 */

export const LOCALES = ["sk", "en"] as const;

export type Locale = (typeof LOCALES)[number];

/** Slovak is the app's first language; an unrecognised browser lands here. */
export const DEFAULT_LOCALE: Locale = "sk";

export const LOCALE_COOKIE = "wishlist-locale";

/** A year. The choice is a preference, not a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * How the switcher names each language — always in the language it selects, so
 * the item is legible to the person who wants it even when the surrounding menu
 * is not.
 *
 * Deliberately **not** in the message catalogues: the pair reads the same in
 * both, and a translator finding "Use English" in `sk.json` would helpfully
 * translate it and break the one property that makes it useful.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "Use English",
  sk: "Použiť slovenčinu",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

/** The language to offer, given the one in use. Two locales, so it is the other. */
export function otherLocale(locale: Locale): Locale {
  return locale === "sk" ? "en" : "sk";
}

/**
 * The best supported language for an `Accept-Language` header, or Slovak.
 *
 * Hand-rolled rather than `negotiator` + `@formatjs/intl-localematcher`: two
 * locales do not pay for two dependencies, and a pure function is testable
 * under the repo's no-mocks rule.
 *
 * Matching is on the primary subtag, so `en-GB` and `en-US` both find `en`.
 * Equal q-values keep header order, which is how a browser expresses preference
 * within one quality band.
 */
export function pickLocale(
  acceptLanguage: string | null | undefined,
): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE;

  const ranked = acceptLanguage
    .split(",")
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params
        .map((param) => param.trim())
        .find((param) => param.startsWith("q="));
      const quality = q ? Number.parseFloat(q.slice(2)) : 1;
      return {
        primary: tag.trim().toLowerCase().split("-")[0],
        // A malformed q reads as unacceptable rather than as best.
        quality: Number.isFinite(quality) ? quality : 0,
        index,
      };
    })
    .filter((entry) => entry.quality > 0)
    .sort((a, b) => b.quality - a.quality || a.index - b.index);

  for (const entry of ranked) {
    // `*` means "anything else will do", which the default already answers.
    if (entry.primary === "*") return DEFAULT_LOCALE;
    if (isLocale(entry.primary)) return entry.primary;
  }

  return DEFAULT_LOCALE;
}
