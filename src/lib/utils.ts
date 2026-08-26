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
 * A date the way the reader's language writes one — "12. decembra 2025" in
 * Slovak, "12 December 2025" in English.
 *
 * The only date this app displays. A claim's timestamp is deliberately never
 * shown; a gift's date is a memory rather than a hint.
 *
 * One formatter per locale, kept: constructing an `Intl.DateTimeFormat` per row
 * is the expensive half, and the app has two languages rather than a long tail
 * of them, so the map cannot grow.
 */
const dateFormats = new Map<string, Intl.DateTimeFormat>();

export function formatDate(iso: string, locale: Locale): string {
  let format = dateFormats.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(DATE_LOCALES[locale], {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    dateFormats.set(locale, format);
  }
  return format.format(new Date(iso));
}

/**
 * `en-GB` rather than `en`, which would give "December 12, 2025" — the app is
 * read in Slovakia, where the day comes first.
 */
const DATE_LOCALES: Record<Locale, string> = {
  sk: "sk-SK",
  en: "en-GB",
};
