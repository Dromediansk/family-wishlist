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
