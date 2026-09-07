/**
 * The look of a form field: `input.tsx`, `textarea.tsx`, `label.tsx` and
 * `WishForm`'s group checkbox.
 *
 * The same reason `dialog-styles.ts` exists, for a different set of files: the
 * landing page draws the add-wish dialog as an illustration
 * (`landing/mock/mock-add-wish.tsx`) out of static elements, because nothing in
 * a mock may be focusable. With the classes spelled out there as well as here,
 * a restyled field would leave the picture of it behind and nothing would
 * complain.
 *
 * Plain strings rather than `cva` — there are no variants to select between.
 * Each is a literal so Tailwind's scanner can see the class names.
 *
 * Deliberately no `"use client"`: `label.tsx` has one, and every export of a
 * client module reaches a Server Component as a client reference rather than as
 * the string it is.
 */

/**
 * `leading-tight`, not `leading-none`: a line box the exact height of the type
 * clips the caron off a capital Č or Ľ, which Slovak labels have.
 */
export const LABEL = "text-base leading-tight font-medium select-none";

/**
 * `text-base` is 17px. Anything under 16px makes iOS Safari zoom the viewport
 * the moment the field takes focus, and never zoom back out.
 */
export const INPUT =
  "border-input bg-background placeholder:text-muted-foreground flex h-11 w-full rounded-md border px-3.5 py-2 text-base shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/** 17px for the same reason as `INPUT` — under 16px iOS zooms on focus. */
export const TEXTAREA =
  "border-input bg-background placeholder:text-muted-foreground flex min-h-28 w-full rounded-md border px-3.5 py-2.5 text-base shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50";

/**
 * The group picker's box. `size-5` is the smallest that is still a comfortable
 * target beside 17px type, and `mt-0.5` is what centres it against the first
 * line of a name rather than against the whole wrapped block — the row it sits
 * in is `items-start`, for the reason `WishForm`'s picker states.
 */
export const CHECKBOX = "mt-0.5 size-5 shrink-0 accent-primary";
