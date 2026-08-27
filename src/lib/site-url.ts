import { DEFAULT_LOCALE, LOCALES, type Locale } from "@/i18n/config";

/**
 * Where the app lives, and what each public page is called in each language.
 *
 * The origin exists because `metadataBase` needs one: Next raises a build error
 * for a relative URL in any URL-based metadata field without it, so canonical,
 * hreflang and the Open Graph image all wait on this.
 *
 * Deliberately **not** `siteOrigin()` from src/app/actions/auth.ts. That one is
 * `async` — it reads `x-forwarded-host` — and lives behind `"use server"`;
 * metadata is resolved without a request in hand, so it needs an answer a
 * synchronous function can give.
 */

/** The pages a crawler may see — the only ones that exist in both languages. */
export const PUBLIC_PATHS = ["/", "/privacy", "/terms"] as const;

export type PublicPath = (typeof PUBLIC_PATHS)[number];

/**
 * Split out from `siteUrl()` so the precedence can be tested without touching
 * `process.env` — the repo's tests take no mocks.
 */
export function resolveSiteUrl(
  configured: string | undefined,
  vercelHost: string | undefined,
): string {
  const explicit = configured?.trim().replace(/\/+$/, "");
  if (explicit) return explicit;

  // Vercel injects the production domain at build and at run time, so a deploy
  // is correct before anybody remembers to set NEXT_PUBLIC_SITE_URL. It arrives
  // as a bare host, never a URL.
  const host = vercelHost?.trim().replace(/\/+$/, "");
  if (host) return `https://${host}`;

  return "http://localhost:3000";
}

export function siteUrl(): string {
  return resolveSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  );
}

/**
 * Slovak keeps the bare path and English is prefixed, because Slovak is the
 * app's first language: it holds the shorter URL, and `x-default` points at it.
 */
export function localisedPath(path: PublicPath, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return path;
  return path === "/" ? "/en" : `/en${path}`;
}

/**
 * Every public URL and the language it is written in — both halves of the
 * hreflang cluster, built from one list so a page cannot exist in one language
 * and be forgotten in the other.
 */
const PUBLIC_PAGE_LOCALES = new Map<string, Locale>(
  LOCALES.flatMap((locale) =>
    PUBLIC_PATHS.map(
      (path) => [localisedPath(path, locale), locale] as const,
    ),
  ),
);

/**
 * The language a public page is written in, or `null` for everything else —
 * the app's own screens, where the reader's cookie decides instead.
 *
 * This is also the list `isPublic()` in src/proxy.ts answers from, so opening a
 * page to crawlers and giving it a language are the same edit.
 */
export function publicPageLocale(pathname: string): Locale | null {
  return PUBLIC_PAGE_LOCALES.get(pathname) ?? null;
}

/**
 * The canonical and hreflang pair for one page, so six route files cannot drift
 * apart. Reciprocity and self-reference — both of which Google requires — fall
 * out of building every link from the same list.
 *
 * Paths stay relative: Next resolves them against `metadataBase`, which is the
 * one place the origin is decided.
 *
 * The code for Slovak is `sk`. `sl` is Slovenian, and Google would accept it
 * without a word. docs/decisions/language.md#the-public-pages-pin-their-locale
 */
export function alternatesFor(path: PublicPath, locale: Locale) {
  return {
    canonical: localisedPath(path, locale),
    languages: {
      sk: localisedPath(path, "sk"),
      en: localisedPath(path, "en"),
      "x-default": localisedPath(path, DEFAULT_LOCALE),
    },
  };
}
