"use client";

import { useEffect, useRef, useState } from "react";

import {
  type HeaderState,
  nextHeaderState,
  shownHeaderState,
} from "@/lib/sticky-header";
import { cn } from "@/lib/utils";

/** `z-30`: a rung under the install nudge, which is itself under everything modal. */
const BAR_LAYOUT =
  "sticky top-0 z-30 flex items-center justify-between gap-4 -mx-(--gutter) px-(--gutter)";

/**
 * The padding is cancelled by an equal negative margin, so at rest the bar lays
 * out like the plain row it replaced (`pb-3` + `mb-5` is the old `mb-8`) while
 * the stuck bar still has room on both edges.
 */
const BAR_INSET = "mt-[calc(var(--header-inset)*-1)] pt-(--header-inset) pb-3 mb-5";

/**
 * `translate` rather than `transform`: Tailwind 4 writes `translate-y-*` to the
 * `translate` property, the same trap `landing/landing.css` documents for
 * `rotate`.
 */
const BAR_MOTION =
  "motion-safe:transition-[translate,background-color] motion-safe:duration-200 motion-safe:ease-out";

/**
 * The header's own element: pinned to the top of the viewport, out of the way
 * on the way down, back on the way up.
 * docs/decisions/ui-patterns.md#the-header-stays-within-reach
 *
 * A client boundary around server-rendered children, so `SiteHeader` stays a
 * Server Component and its account half keeps streaming behind its own
 * `Suspense`. The `<header>` is rendered here because the classes are the state.
 */
export function StickyHeader({ children }: { children: React.ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const state = useRef<HeaderState>(shownHeaderState(0));

  useEffect(() => {
    let frame = 0;

    function measure() {
      frame = 0;
      const y = window.scrollY;
      state.current = nextHeaderState(state.current, y);
      setHidden(state.current.hidden);
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
    state.current = shownHeaderState(window.scrollY);
    setHidden(false);
  }

  return (
    <header
      onFocus={reveal}
      className={cn(
        BAR_LAYOUT,
        BAR_INSET,
        BAR_MOTION,
        // Bare until the page moves: over the body's gradient an opaque
        // column-width bar reads as a lighter rectangle, and the blur alone
        // would promote the bar to its own layer and re-grain its text.
        scrolled && "bg-background/80 backdrop-blur-md",
        // The one class that moves, so stillness is the media query's to grant
        // and it stays live if the reader changes their mind.
        hidden && "motion-safe:-translate-y-full",
      )}
    >
      {children}
    </header>
  );
}
