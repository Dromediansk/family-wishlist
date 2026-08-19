import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Slovak counts take three forms: 1 želanie, 2–4 želania, 0 and 5+ želaní.
 * Returns the number together with the right form, e.g. "3 želania".
 */
export function wishCount(count: number): string {
  if (count === 1) return `${count} želanie`;
  if (count >= 2 && count <= 4) return `${count} želania`;
  return `${count} želaní`;
}

/**
 * The account avatar's letter. Spread rather than `[0]`, so a name starting
 * outside the basic plane yields a whole character, not half a surrogate pair.
 */
export function initial(name: string): string {
  return [...name.trim()][0]?.toUpperCase() ?? "?";
}

/**
 * A date the way a Slovak sentence writes one: "12. decembra 2025". Built once
 * — constructing an Intl formatter per row is the expensive half.
 *
 * The only date this app displays. A claim's timestamp is deliberately never
 * shown; a gift's date is a memory rather than a hint.
 */
const dateFormat = new Intl.DateTimeFormat("sk-SK", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}
