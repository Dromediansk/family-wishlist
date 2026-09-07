import { getTranslations } from "next-intl/server";

import {
  MockCard,
  MockClaimedBadge,
} from "@/components/landing/mock/mock-card";
import { buttonVariants } from "@/components/ui/button";
import { WishRow } from "@/components/wish-row";
import {
  CLAIMED_MOCK_KEY,
  MOCK_WISHES,
  toMockDisplayable,
} from "@/lib/landing";
import { cn } from "@/lib/utils";

/* A span, not a button: an illustration must not be a tab stop. Constant, so
   it is built once rather than per row on a `force-dynamic` route. */
const MOCK_ACTION_CLASS = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "pointer-events-none",
);

/**
 * Zuzana's list as everybody else sees it: one wish taken, the rest offered.
 *
 * Only that one angle. Her own side of the list is beat three's `MockSplit`,
 * drawn beside the family's — the claim visibly absent from one half of a pair
 * says more than a list with nothing on it ever could on its own.
 *
 * These rows never reach a query — they come straight from `src/lib/landing.ts`
 * — so this is a picture of the rule the rest of the app enforces, not a site
 * that enforces it in its own right.
 */
export async function MockList({
  className,
  staggerRows = false,
  vanishClaim = false,
}: Readonly<{
  className?: string;
  /** The hero's rows dealt in one at a time, via `.landing-row-stagger` in
      landing.css. The hero only — the story beats already animate as a whole
      on scroll, and doubling up would look nervous. */
  staggerRows?: boolean;
  /** The reservation fades out of the hero. */
  vanishClaim?: boolean;
}>) {
  const t = await getTranslations("landing.mock");
  const tWishes = await getTranslations("wishes");

  return (
    <MockCard caption={t("ownerCaption")} className={className}>
      <ul className={cn("flex flex-col", staggerRows && "landing-row-stagger")}>
        {MOCK_WISHES.map((key) => (
          <WishRow
            key={key}
            wish={toMockDisplayable(key, t(`wishes.${key}`))}
            actionBeside
            action={
              key === CLAIMED_MOCK_KEY ? (
                <MockClaimedBadge vanishing={vanishClaim} />
              ) : (
                <span className={MOCK_ACTION_CLASS}>{tWishes("claim")}</span>
              )
            }
          />
        ))}
      </ul>
    </MockCard>
  );
}
