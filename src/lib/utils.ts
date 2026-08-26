import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import type { Locale } from "@/i18n/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * The account avatar's letter. Spread rather than `[0]`, so a name starting
 * outside the basic plane yields a whole character, not half a surrogate pair.
 */
export function initial(name: string): string {
  return [...name.trim()][0]?.toUpperCase() ?? "?";
}

/**
 * `en-GB` rather than `en`, which would give "December 12, 2025" — the app is
 * read in Slovakia, where the day comes first.
 */
const DATE_LOCALES: Record<Locale, string> = {
  sk: "sk-SK",
  en: "en-GB",
};

/**
 * One formatter per locale, built on first use and kept: constructing an
 * `Intl.DateTimeFormat` per row is the expensive half, and there are two
 * languages rather than a long tail of them, so this cannot grow past two.
 */
const dateFormats: Partial<Record<Locale, Intl.DateTimeFormat>> = {};

/**
 * A date the way the reader's language writes one — "12. decembra 2025" in
 * Slovak, "12 December 2025" in English.
 *
 * The dates this app displays: a gift's date in the two history pages, and the
 * legal pages' effective date. A claim's timestamp is deliberately never shown;
 * a gift's date is a memory rather than a hint.
 */
export function formatDate(iso: string, locale: Locale): string {
  const format = (dateFormats[locale] ??= new Intl.DateTimeFormat(
    DATE_LOCALES[locale],
    { day: "numeric", month: "long", year: "numeric" },
  ));
  return format.format(new Date(iso));
}
