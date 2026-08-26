"use client";

import { GiftIcon, UndoIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { claimWish, unclaimWish } from "@/app/actions/wishes";
import { FulfilWishButton } from "@/components/fulfil-wish-button";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import type { UserId } from "@/lib/ids";
import type { ClaimView } from "@/lib/types";
import { claimedByOther } from "@/lib/visibility";

type Props = {
  wishId: string;
  claim: ClaimView;
  viewerId: UserId;
  /** Both reach `ClaimEndings`; the other two branches never read them. */
  title: string;
  ownerName: string;
};

/**
 * Give back a reservation you hold. Takes the wish and nothing else: the caller
 * has already established that this claim is the viewer's own, so there is no
 * claim state here to render and no name to get wrong.
 */
function ReleaseClaimButton({ wishId }: { wishId: string }) {
  const { pending, error, run } = useAction();
  const t = useTranslations("wishes");

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        loading={pending}
        onClick={() => run(() => unclaimWish(wishId))}
      >
        <UndoIcon />
        {t("release")}
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * The two ways out of a claim you hold, together. Every page that offers one
 * offers both, by rendering this and not the pair.
 * docs/decisions/wishes-claims-history.md
 */
export function ClaimEndings({
  wishId,
  title,
  ownerName,
}: {
  wishId: string;
  /** For the hand-over question, which names both the wish and its owner. */
  title: string;
  ownerName: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-2 sm:justify-end">
      <ReleaseClaimButton wishId={wishId} />
      <FulfilWishButton wishId={wishId} title={title} ownerName={ownerName} />
    </div>
  );
}

/**
 * Claim, release, or hand over an item on someone else's list. Never rendered on
 * your own — the owner branch of the page has no claim state to give it.
 */
export function ClaimButton({
  wishId,
  claim,
  viewerId,
  title,
  ownerName,
}: Props) {
  const { pending, error, run } = useAction();
  const t = useTranslations("wishes");

  // Held by somebody else — the same predicate the row dims on, so the two can
  // never disagree. There is nothing to click either way; the only difference is
  // whether this viewer is told who. A claim from a group they are not in must
  // still show as taken, so nobody buys it twice, and must not name its holder.
  if (claimedByOther(claim, viewerId)) {
    return (
      <span className="text-muted-foreground shrink-0">
        {claim.kind === "taken-by"
          ? t("claimedBy", { name: claim.by.name })
          : t("claimedBySomeone")}
      </span>
    );
  }

  // Whatever is left and not free is the viewer's own.
  if (claim.kind === "taken-by") {
    return <ClaimEndings wishId={wishId} title={title} ownerName={ownerName} />;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button loading={pending} onClick={() => run(() => claimWish(wishId))}>
        <GiftIcon />
        {t("claim")}
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
