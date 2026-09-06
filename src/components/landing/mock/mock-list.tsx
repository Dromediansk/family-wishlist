import { getTranslations } from "next-intl/server";

import { MockCard } from "@/components/landing/mock/mock-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { WishRow } from "@/components/wish-row";
import { CLAIMED_MOCK_ID, MOCK_WISHES, toMockDisplayable } from "@/lib/landing";
import { cn } from "@/lib/utils";

/**
 * Zuzana's list, from one of three angles:
 *
 * - `owner`   — her own view. No claim state at all, which is the whole rule.
 * - `family`  — what everybody else sees: one wish taken, the rest offered.
 * - `vanishing` — `family`, but the reservation fades out. The hero only.
 *
 * PRIVACY-RULE: no tag, because there is no rule to enforce here — these rows
 * come from `src/lib/landing.ts` and no query was made. The variant names are
 * a picture of the rule, not a site of it.
 */
export async function MockList({
  variant,
  className,
  staggerRows = false,
}: Readonly<{
  variant: "owner" | "family" | "vanishing";
  className?: string;
  /** The hero's rows dealt in one at a time, via `.landing-row-stagger` in
      landing.css. The hero only — the story beats already animate as a whole
      on scroll, and doubling up would look nervous. */
  staggerRows?: boolean;
}>) {
  const t = await getTranslations("landing.mock");
  const tWishes = await getTranslations("wishes");
  const titles = MOCK_WISHES.map((spec) => t(`wishes.${spec.key}`));

  return (
    <MockCard caption={t("ownerCaption")} className={className}>
      <ul className={cn(staggerRows && "landing-row-stagger")}>
        {MOCK_WISHES.map((spec, index) => (
          <WishRow
            key={spec.id}
            wish={toMockDisplayable(spec, titles[index])}
            actionBeside
            action={
              variant === "owner" ? null : spec.id === CLAIMED_MOCK_ID ? (
                <Badge
                  variant="accent"
                  /* It ends invisible in both the animated and the still case —
                     announcing who reserved it on the owner's own list is
                     precisely what this illustration exists to say never
                     happens. */
                  aria-hidden={variant === "vanishing"}
                  className={cn(variant === "vanishing" && "landing-vanish")}
                >
                  {tWishes("claimedBy", { name: t("claimerName") })}
                </Badge>
              ) : (
                /* A span, not a button: an illustration must not be a tab stop. */
                <span
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "pointer-events-none",
                  )}
                >
                  {tWishes("claim")}
                </span>
              )
            }
          />
        ))}
      </ul>
    </MockCard>
  );
}
