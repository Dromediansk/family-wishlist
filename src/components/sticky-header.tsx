"use client";

import { useEffect, useRef, useState } from "react";

import {
  INITIAL_HEADER_STATE,
  nextHeaderState,
  type HeaderState,
} from "@/lib/sticky-header";
import { cn } from "@/lib/utils";

/*
 * `z-30` and no higher: a new rung under `z-40`, the install nudge, and `z-50`,
 * which the dialog overlay, the dialog panel and the dropdown menu share.
 *
 * The side bleed is what makes the background reach the column's edges —
 * without it the bar stops 16px short and content slides past in the gutters.
 *
 * The vertical padding is cancelled by an equal negative margin, so at rest this
 * lays out to the pixel like the plain row it replaced (`pb-3` + `mb-5` is the
 * old `mb-8`) while the stuck bar still has room on both edges. The top inset
 * has to be the bar's own rather than the column's: `viewportFit: "cover"`
 * draws under the notch, and once the bar has left the column's padding behind,
 * nothing else is holding it clear of the status bar.
 *
 * `transition-[translate,…]` rather than `transition-transform`, because
 * Tailwind 4 writes `translate-y-*` to the `translate` property — the same trap
 * `landing.css` documents for `rotate`.
 */
const BAR =
  "sticky top-0 z-30 -mx-4 mb-5 flex items-center justify-between gap-4 px-4 pb-3 sm:-mx-6 sm:px-6 " +
  "mt-[calc(max(0.75rem,env(safe-area-inset-top))*-1)] pt-[max(0.75rem,env(safe-area-inset-top))] " +
  "motion-safe:transition-[translate,background-color] motion-safe:duration-200 motion-safe:ease-out";

/**
 * The header's own element: pinned to the top of the viewport, out of the way
 * on the way down, back on the way up.
 *
 * A client boundary around server-rendered children, so `SiteHeader` stays a
 * Server Component and its account half keeps streaming behind its own
 * `Suspense`. The `<header>` is rendered here rather than there because the
 * classes are the state.
 *
 * Sticky inside the column rather than `fixed` over it: a fixed bar ignores the
 * `padding-right` Radix's scroll lock puts on `<body>` and would jump sideways
 * every time a dialog opened, and the header's height has to stay inside the
 * `min-h-dvh` column for the footer to land on the bottom edge.
 * docs/decisions/ui-patterns.md#layout-contract
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  // Bare until the page moves, so the body's gradient is untouched at rest — an
  // opaque column-width bar over it reads as a lighter rectangle, and the blur
  // alone would promote the bar to its own layer and re-grain its text.
  const [scrolled, setScrolled] = useState(false);
  const state = useRef<HeaderState>(INITIAL_HEADER_STATE);

  useEffect(() => {
    // Motion is opt-in here as everywhere: a reader who asks for stillness gets
    // a bar that is sticky and simply never moves. It still has to earn its
    // background, or the text passing under it would be unreadable.
    // docs/decisions/ui-patterns.md#layout-contract
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;

    function measure() {
      frame = 0;
      const y = window.scrollY;
      state.current = nextHeaderState(state.current, y);
      setHidden(still ? false : state.current.hidden);
      setScrolled(y > 0);
    }

    function onScroll() {
      // One reading per frame. A scroll event can fire far more often than that.
      if (!frame) frame = requestAnimationFrame(measure);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    // The document may already be part-way down: a restored position, or an
    // anchor the browser jumped to before this mounted.
    measure();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  /**
   * Shift+Tab reaches the header's links whether or not it is on screen, so
   * arriving there has to bring it back — and re-anchor, or the next frame
   * would decide the reader is still going down and hide it again.
   */
  function reveal() {
    const y = window.scrollY;
    state.current = { hidden: false, anchor: y, last: y };
    setHidden(false);
  }

  return (
    <header
      onFocus={reveal}
      className={cn(
        BAR,
        scrolled && "bg-background/80 backdrop-blur-md",
        hidden && "-translate-y-full",
      )}
    >
      {children}
    </header>
  );
}
