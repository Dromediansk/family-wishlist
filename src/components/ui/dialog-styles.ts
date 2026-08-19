/**
 * The look of `dialog.tsx` and `alert-dialog.tsx`.
 *
 * The two are forks of the same shadcn file and had drifted apart once already,
 * so every value either of them renders lives here — including the pieces only
 * one of them uses. They differ in exactly one way: on a phone a `Dialog` fills
 * the screen (`PANEL_FULLSCREEN` + `PANEL_CARD_SM`) while an `AlertDialog` stays
 * a centred card at every size (`PANEL_CARD`).
 *
 * Plain strings rather than `cva` — there are no variants to select between,
 * only pieces to concatenate. Each is a literal so Tailwind's scanner can see
 * the class names, which is also why the `sm:` twins are spelled out.
 *
 * docs/content/ui-patterns.md#dialogs
 */

export const ANIMATION_FADE =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

/** Fades with the panel it dims — hence composed from the same constant. */
export const OVERLAY = `fixed inset-0 z-50 bg-black/50 ${ANIMATION_FADE}`;

/**
 * Position, colour and the three-region column. Both panels are centred at every
 * size — full-screen is expressed as *sizing* below, never as a different
 * anchor, so there is no `inset`-versus-`top` override to get the wrong way
 * round.
 *
 * `overflow-hidden` is what confines scrolling to the body region instead of
 * letting the whole panel scroll.
 */
export const PANEL_BASE =
  "bg-background fixed top-1/2 left-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden shadow-lg duration-200";

/**
 * The centred card's sizing. `w-[calc(100%-2rem)]` rather than `w-full`: at
 * `w-full` the card butts against both edges of a phone, which is a full-screen
 * dialog wearing a border. The margin is what makes it read as a card.
 */
export const PANEL_CARD =
  "max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-xl border";

/**
 * The full-screen panel's sizing: the whole screen, still centred.
 *
 * A percentage height, not a dynamic-viewport one — see
 * docs/content/ui-patterns.md#the-keyboard.
 */
export const PANEL_FULLSCREEN = "h-full w-full";

/** The same card as `PANEL_CARD` once there is room. The two must agree. */
export const PANEL_CARD_SM =
  "sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:rounded-xl sm:border";

/** How a card appears. Wrong for something the size of the screen. */
export const ANIMATION_ZOOM =
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95";

/**
 * How a full-screen panel appears: up from the edge it is about to cover. The
 * unsuffixed utilities travel the panel's full height — a 16px nudge on a
 * screen-tall sheet reads as a flinch rather than a movement.
 */
export const ANIMATION_SLIDE_UP =
  "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom";

/**
 * Cancels the slide for the centred card, which zooms instead — the `sm:` twin
 * of `ANIMATION_ZOOM`, and changes here belong there too. The `-0` is needed
 * explicitly: the travel is a custom property, so without it the card would
 * inherit the sheet's 100% and slide *and* zoom at once.
 */
export const ANIMATION_CARD_SM =
  "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95";

/*
 * The regions. Padding sits on these rather than on the panel, and the seams are
 * 12 + 4 — adjust one side and you owe the other its complement. The body's
 * `py-1` is load bearing: it keeps `:focus-visible` from being clipped by
 * `overflow-y-auto`. docs/content/ui-patterns.md#three-things-that-will-bite
 */

export const HEADER =
  "flex shrink-0 flex-col gap-1.5 px-6 pt-6 pb-3 text-left";

/** `overscroll-contain` stops a phone rubber-banding the page behind the panel. */
export const BODY =
  "min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-1";

export const FOOTER =
  "flex shrink-0 flex-col-reverse gap-2 px-6 pt-3 pb-6 sm:flex-row sm:justify-end";

/*
 * `HEADER`'s `pt-6` and `FOOTER`'s `pb-6` again, in a form a notch or a home
 * indicator can raise — here so the 1.5rem stays beside the `6` it must equal.
 * Only the full-screen `Dialog` applies them; the centred card never reaches the
 * edges of the screen.
 */

export const HEADER_SAFE_TOP = "pt-[max(1.5rem,env(safe-area-inset-top))]";

export const FOOTER_SAFE_BOTTOM =
  "pb-[max(1.5rem,env(safe-area-inset-bottom))]";

export const TITLE = "text-xl leading-snug font-semibold";

export const DESCRIPTION = "text-muted-foreground text-base";
