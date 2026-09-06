import { getTranslations } from "next-intl/server";

import { MockCard } from "@/components/landing/mock/mock-card";
import { Badge } from "@/components/ui/badge";
import { CLAIMED_MOCK_ID, MOCK_WISHES, toMockDisplayable } from "@/lib/landing";
import { WishRow } from "@/components/wish-row";
import { cn } from "@/lib/utils";

/**
 * Beat three: one wish, both viewpoints, side by side. The claim is visibly
 * absent from the owner's half — the page's whole argument, standing still.
 *
 * Two columns from `sm:` up and two stacked cards below it. Side by side on a
 * 360px screen, each half would be ~150px wide and neither would be readable.
 */
export async function MockSplit({ className }: Readonly<{ className?: string }>) {
  const t = await getTranslations("landing.mock");
  const spec = MOCK_WISHES.find((wish) => wish.id === CLAIMED_MOCK_ID);
  // `CLAIMED_MOCK_ID` naming a wish on the list is pinned by a test; this
  // narrows the type for the compiler rather than guarding against anything.
  if (!spec) return null;
  const wish = toMockDisplayable(spec, t(`wishes.${spec.key}`));

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      <MockCard caption={t("familySees")}>
        <ul>
          <WishRow
            wish={wish}
            actionBeside
            action={<Badge variant="accent">{t("claimedBy")}</Badge>}
          />
        </ul>
      </MockCard>
      <MockCard caption={t("ownerSees")}>
        <ul>
          <WishRow wish={wish} />
        </ul>
      </MockCard>
    </div>
  );
}
