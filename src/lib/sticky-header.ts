/**
 * When the site header is on screen, and when it has got out of the way.
 *
 * A pure state machine so the awkward part — direction, hysteresis, the lies a
 * scroll offset tells — is testable without a browser. The listener that feeds
 * it lives in `src/components/sticky-header.tsx`.
 * docs/decisions/ui-patterns.md#layout-contract
 */

/** Within this much of the top the header is always shown, whatever the direction. */
export const TOP_ZONE = 80;

/** Downward travel from the last turning point before the header hides. */
export const HIDE_AFTER = 64;

/** Upward travel before it comes back — shorter, so the way back is cheap. */
export const SHOW_AFTER = 32;

/** A step this big between two samples is a restored position, not a gesture. */
export const JUMP = 240;

export type HeaderState = {
  hidden: boolean;
  /** The turning point the current run is measured from. */
  anchor: number;
  /**
   * The previous offset. Not the same as the anchor, which stops at the extreme
   * of the run: it is the frame-to-frame step that says whether the reader
   * travelled or arrived.
   */
  last: number;
};

/**
 * The header on screen, with the run measured from here. The only way to build
 * a shown state: the clamp is easy to forget, and a bounce would otherwise
 * anchor the next run at a negative offset.
 */
export function shownHeaderState(y: number): HeaderState {
  // Overscroll rubber-banding reports offsets past both ends of the document.
  // Neither end is a direction.
  const top = y > 0 ? y : 0;
  return { hidden: false, anchor: top, last: top };
}

/**
 * Folds one scroll offset into the state.
 *
 * The anchor tracks the *extreme* reached in the current direction rather than
 * the previous sample: measured sample to sample, a slow drag accumulates a
 * direction it never really had, and a trackpad's jitter flips the header on
 * and off.
 */
export function nextHeaderState(state: HeaderState, y: number): HeaderState {
  const shown = shownHeaderState(y);
  const top = shown.anchor;

  if (top <= TOP_ZONE) return shown;

  // Back-navigation restores a position in a single step. Read as travel, it
  // would whip the header away on arrival at a page the reader has not moved.
  if (Math.abs(top - state.last) > JUMP) return shown;

  if (state.hidden) {
    const deepest = Math.max(state.anchor, top);
    return deepest - top >= SHOW_AFTER
      ? shown
      : { hidden: true, anchor: deepest, last: top };
  }

  const highest = Math.min(state.anchor, top);
  return top - highest >= HIDE_AFTER
    ? { hidden: true, anchor: top, last: top }
    : { hidden: false, anchor: highest, last: top };
}
