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
  type MockVariant,
} from "@/lib/landing";
import { cn } from "@/lib/utils";

/* A span, not a button: an illustration must not be a tab stop. Constant, so
   it is built once rather than per row on a `force-dynamic` route. */
const MOCK_ACTION_CLASS = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "pointer-events-none",
);

/**
 * Zuzana's list, from one of two angles:
 *
 * - `owner`  — her own view. No claim state at all, which is the whole rule.
 * - `family` — what everybody else sees: one wish taken, the rest offered.
 *
 * These rows never reach a query — they come straight from `src/lib/landing.ts`
 * — so the variant names are a picture of the rule the rest of the app
 * enforces, not a site that enforces it in its own right.
 */
export async function MockList({
  variant,
  className,
  staggerRows = false,
  vanishClaim = false,
}: Readonly<{
  /** `split` never reaches here — that beat renders `MockSplit` instead. */
  variant: Exclude<MockVariant, "split">;
  className?: string;
  /** The hero's rows dealt in one at a time, via `.landing-row-stagger` in
      landing.css. The hero only — the story beats already animate as a whole
      on scroll, and doubling up would look nervous. */
  staggerRows?: boolean;
  /** The reservation fades out of the hero. A motion knob beside `staggerRows`
      rather than a fourth `variant`: which viewpoint the list shows and how it
      animates are independent. */
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
              variant === "owner" ? null : key === CLAIMED_MOCK_KEY ? (
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
