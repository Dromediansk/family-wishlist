import { getTranslations } from "next-intl/server";

import { MockFigure } from "@/components/landing/mock/mock-card";
import { MockList } from "@/components/landing/mock/mock-list";
import { MockSplit } from "@/components/landing/mock/mock-split";
import type { BeatSpec } from "@/lib/landing";
import { cn } from "@/lib/utils";

/**
 * One step of the story: a heading, a paragraph, and the screen it describes.
 *
 * The illustration alternates sides from `sm:` up and the text always comes
 * first in the DOM, so the reading order is heading → prose → picture whichever
 * side the picture is drawn on.
 *
 * The `split` beat is the exception: `MockSplit` already spends its own width
 * on two side-by-side viewpoint cards, so nesting it in this beat's other
 * two-column layout would halve an already-halved column — each card would
 * land under 200px wide and wrap its title one character per line. That beat
 * instead gets the full content measure, heading and prose above, the figure
 * below, so `MockSplit`'s two cards have the ~470px each they need.
 */
export async function StoryBeat({ beat }: Readonly<{ beat: BeatSpec }>) {
  const t = await getTranslations("landing");
  const tMock = await getTranslations("landing.mock");
  const isSplit = beat.mock === "split";

  return (
    <section
      className={cn(
        "landing-reveal py-10 sm:py-14",
        isSplit
          ? "flex flex-col gap-6"
          : "grid items-center gap-6 sm:grid-cols-2 sm:gap-12",
      )}
    >
      <div
        className={cn(
          // `beat.side` orders text against a picture beside it; the split
          // beat's picture is below, not beside, so there is no side to order
          // against and the field is deliberately unused on this branch.
          !isSplit && beat.side === "start" && "sm:order-last",
        )}
      >
        <h2 className="text-xl font-semibold text-balance">
          {t(`beats.${beat.key}.title`)}
        </h2>
        {/* 62ch is the app's measure for left-aligned body copy.
            docs/decisions/ui-patterns.md#typography */}
        <p className="text-muted-foreground mt-3 max-w-[62ch] text-pretty">
          {t(`beats.${beat.key}.body`)}
        </p>
      </div>

      <MockFigure caption={tMock(`figures.${beat.mock}`)}>
        {/* Narrowed on `beat.mock` directly, not on `isSplit`: TS can't carry
            the boolean's narrowing back to `beat.mock`'s type. */}
        {beat.mock === "split" ? <MockSplit /> : <MockList variant={beat.mock} />}
      </MockFigure>
    </section>
  );
}
