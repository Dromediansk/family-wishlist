import { clsx, type ClassValue } from "clsx";
import { format, parseISO, type Locale as DateFnsLocale } from "date-fns";
import { enGB, sk } from "date-fns/locale";
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
 * Explicit patterns rather than date-fns's `PPP`, whose English is US-style
 * ("December 12th, 2025") — the app is read in Slovakia, where the day comes
 * first. Slovak `MMMM` in a formatting context is already the genitive.
 */
const DATE_FORMATS = {
  sk: { pattern: "d. MMMM yyyy", locale: sk },
  en: { pattern: "d MMMM yyyy", locale: enGB },
} as const satisfies Record<Locale, { pattern: string; locale: DateFnsLocale }>;

/**
 * A date the way the reader's language writes one — "12. decembra 2025" in
 * Slovak, "12 December 2025" in English.
 *
 * The dates this app displays: a gift's date in the two history pages, the
 * legal pages' effective date, and a wish's needed-by date. A claim's timestamp
 * is deliberately never shown; a gift's date is a memory rather than a hint.
 *
 * `parseISO` keeps a bare `yyyy-MM-dd` on its own calendar day; `new Date()`
 * would read it as UTC midnight and show the day before west of UTC.
 */
export function formatDate(iso: string, locale: Locale): string {
  const { pattern, locale: dateLocale } = DATE_FORMATS[locale];
  return format(parseISO(iso), pattern, { locale: dateLocale });
}
