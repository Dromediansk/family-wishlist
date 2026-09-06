import { getTranslations } from "next-intl/server";

import {
  MockCard,
  MockClaimedBadge,
} from "@/components/landing/mock/mock-card";
import { WishRow } from "@/components/wish-row";
import { CLAIMED_MOCK_KEY, toMockDisplayable } from "@/lib/landing";

/**
 * Beat three: one wish, both viewpoints, side by side. The claim is visibly
 * absent from the owner's half — the page's whole argument, standing still.
 *
 * Two columns from `sm:` up and two stacked cards below it. Side by side on a
 * 360px screen, each half would be ~150px wide and neither would be readable.
 */
export async function MockSplit() {
  const t = await getTranslations("landing.mock");
  const wish = toMockDisplayable(
    CLAIMED_MOCK_KEY,
    t(`wishes.${CLAIMED_MOCK_KEY}`),
  );

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <MockCard caption={t("familySees")}>
        <ul className="flex flex-col">
          <WishRow wish={wish} actionBeside action={<MockClaimedBadge />} />
        </ul>
      </MockCard>
      <MockCard caption={t("ownerSees")}>
        <ul className="flex flex-col">
          <WishRow wish={wish} />
        </ul>
      </MockCard>
    </div>
  );
}
