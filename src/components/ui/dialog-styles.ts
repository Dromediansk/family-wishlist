/**
 * The look of `dialog.tsx` and `alert-dialog.tsx`.
 *
 * The two are forks of the same shadcn file and had drifted apart once already
 * — the title sizes disagreed until somebody noticed. Every value either of
 * them renders lives here instead, including the pieces only one of them uses,
 * so that the way they differ is visible in one file rather than inferred from
 * two.
 *
 * They differ in exactly one way, and it is deliberate: on a phone a `Dialog`
 * fills the screen (`PANEL_FULLSCREEN` + `PANEL_CARD_SM`) while an
 * `AlertDialog` stays a centred card at every size (`PANEL_CARD`). A form needs
 * the room; a two-line question blown up to full-screen reads as heavier than
 * the decision it is asking about.
 *
 * Plain strings rather than `cva` — there are no variants to select between,
 * only pieces to concatenate. Each string is a literal so Tailwind's scanner
 * can see the class names; that is also why the `sm:` twins below are spelled
 * out rather than built by interpolating a prefix.
 */

export const ANIMATION_FADE =
  "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

/** Fades with the panel it dims — hence composed from the same constant. */
export const OVERLAY = `fixed inset-0 z-50 bg-black/50 ${ANIMATION_FADE}`;

/**
 * Position, colour and the three-region column. Both panels are centred at
 * every size — full-screen is expressed as *sizing* below, never as a different
 * anchor, so there is no `inset`-versus-`top` override to get the wrong way
 * round.
 *
 * `overflow-hidden` matters: it is what confines scrolling to the body region
 * instead of letting the whole panel scroll, which is how the header and footer
 * stay put.
 */
export const PANEL_BASE =
  "bg-background fixed top-1/2 left-1/2 z-50 flex -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden shadow-lg duration-200";

/**
 * The centred card's sizing.
 *
 * `w-[calc(100%-2rem)]` rather than `w-full`: at `w-full` the card spans the
 * whole width of a phone and butts against both edges, which is a full-screen
 * dialog wearing a border. The margin is what makes it read as a card.
 *
 * `max-h` + the body region's scrolling replaces the old behaviour, where a
 * panel taller than the screen simply ran off it with no way to reach the rest.
 */
export const PANEL_CARD =
  "max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg rounded-xl border";

/**
 * The full-screen panel's sizing: the whole screen, still centred.
 *
 * A percentage height, not a dynamic-viewport one. A fixed element's
 * percentage height resolves against the layout viewport, which is the thing
 * that actually shrinks when Android honours the root layout's
 * `interactiveWidget: "resizes-content"` and reflows for the keyboard (see the
 * viewport comment in `src/app/layout.tsx`). The viewport units track the
 * browser's own toolbars instead, and would leave the panel screen-tall —
 * footer below the fold — with a keyboard up.
 */
export const PANEL_FULLSCREEN = "h-full w-full";

/**
 * …and the same card as `PANEL_CARD` once there is room for one. The two must
 * agree: they are the same object at two sizes, and the whole point of this
 * file is that nobody has to notice when only one of them is edited.
 */
export const PANEL_CARD_SM =
  "sm:h-auto sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:rounded-xl sm:border";

/** How a card appears. Wrong for something the size of the screen. */
export const ANIMATION_ZOOM =
  "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95";

/**
 * How a full-screen panel appears: up from the edge it is about to cover.
 *
 * The unsuffixed utilities are a full 100% of the panel's own height, not a
 * few pixels — a 16px nudge on a screen-tall sheet reads as a flinch rather
 * than a movement.
 */
export const ANIMATION_SLIDE_UP =
  "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom";

/**
 * Cancels the slide again for the centred card, which zooms instead — the
 * `sm:` twin of `ANIMATION_ZOOM`, and changes here belong there too.
 *
 * The `-0` is needed explicitly: the enter/exit translation is a custom
 * property, so without it the card would inherit the sheet's 100% travel and
 * slide *and* zoom at once.
 */
export const ANIMATION_CARD_SM =
  "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95";

/*
 * The regions.
 *
 * Padding sits on these rather than on the panel. With a padded panel the
 * scrolling middle would clip six units inside its own edge, so text would fade
 * out in mid-air instead of at the boundary — and the pinned header and footer
 * could not draw a full-width rule.
 *
 * The numbers reproduce what the panel's old uniform padding and gap produced:
 * 24px at the outer edges, 16px on each seam (12 + 4). Adjust one and you owe
 * the other its complement.
 *
 * That the body's share of the seam is `py-1` rather than nothing is load
 * bearing. `globals.css` gives `:focus-visible` a 2px outline at 2px offset, so
 * a focused field paints 4px outside itself — with no padding, `overflow-y-auto`
 * would clip the focus ring of the first and last field in the form.
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
 * indicator can raise. They live here rather than at the one component that
 * applies them so that the 1.5rem stays next to the `6` it has to equal.
 *
 * Only the full-screen `Dialog` applies them, because only its header and
 * footer actually reach the edges of the screen; the centred card never does.
 * Without a notch the `max()` resolves to the same 1.5rem, so neither needs an
 * `sm:` counterpart.
 */

export const HEADER_SAFE_TOP = "pt-[max(1.5rem,env(safe-area-inset-top))]";

export const FOOTER_SAFE_BOTTOM =
  "pb-[max(1.5rem,env(safe-area-inset-bottom))]";

export const TITLE = "text-xl leading-snug font-semibold";

export const DESCRIPTION = "text-muted-foreground text-base";
