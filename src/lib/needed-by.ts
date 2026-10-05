import { TZDate } from "@date-fns/tz";
import { format, isMatch } from "date-fns";

/*
 * A wish's optional "needed by" day. Informational only — nothing reads it to
 * end, hide or reorder a wish, because the one rule lets no date end the
 * secret. docs/decisions/wishes-claims-history.md#a-needed-by-date
 */

/** Whose calendar "today" is read from. The app is read in Slovakia. */
export const NEEDED_BY_ZONE = "Europe/Bratislava";

const DAY = "yyyy-MM-dd";

/** What the form asks for, mirroring the photo's three cases. */
export type NeededByIntent =
  { kind: "unchanged" } | { kind: "clear" } | { kind: "set"; date: string };

/*
 * The shape check keeps out what `isMatch` would be lenient about, such as a
 * one-digit month; `isMatch` is what refuses a day the month does not have.
 */
const SHAPE = /^\d{4}-\d{2}-\d{2}$/;

export function isNeededByDate(value: string): boolean {
  return SHAPE.test(value) && isMatch(value, DAY);
}

/*
 * Days compare as `yyyy-MM-dd` strings, each formatted in Bratislava's zone.
 * Comparing a parsed bare date with a zoned instant would set the server's
 * midnight against Bratislava's.
 */
function today(now: Date): string {
  return format(new TZDate(now, NEEDED_BY_ZONE), DAY);
}

export function isNeededByPast(date: string, now = new Date()): boolean {
  return date < today(now);
}

/** Today or later: a day that has already gone cannot be needed by. */
export function isNeededByAcceptable(date: string, now = new Date()): boolean {
  return !isNeededByPast(date, now);
}

/** What the form's field means, given what the wish carried when it opened. */
export function neededByIntent(
  value: string,
  initial: string | null,
): NeededByIntent {
  if (value === (initial ?? "")) return { kind: "unchanged" };
  if (value === "") return { kind: "clear" };
  return { kind: "set", date: value };
}

/** `update_wish`'s two parameters: whether to write, and what. */
export function neededByColumn(intent: NeededByIntent): {
  set: boolean;
  value: string | null;
} {
  if (intent.kind === "unchanged") return { set: false, value: null };
  return { set: true, value: intent.kind === "set" ? intent.date : null };
}
