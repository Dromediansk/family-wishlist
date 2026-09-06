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
 */
export async function StoryBeat({ beat }: Readonly<{ beat: BeatSpec }>) {
  const t = await getTranslations("landing");
  const tMock = await getTranslations("landing.mock");

  return (
    <section className="landing-reveal grid items-center gap-6 py-10 sm:grid-cols-2 sm:gap-12 sm:py-14">
      <div className={cn(beat.side === "start" && "sm:order-last")}>
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
        {beat.mock === "split" ? (
          <MockSplit />
        ) : (
          <MockList variant={beat.mock} />
        )}
      </MockFigure>
    </section>
  );
}
