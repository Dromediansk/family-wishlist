"use client";

import { GiftIcon, UndoIcon } from "lucide-react";

import { claimWish, unclaimWish } from "@/app/actions/wishes";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import type { UserId } from "@/lib/ids";
import type { ClaimView } from "@/lib/types";
import { claimedByOther } from "@/lib/visibility";

type Props = {
  wishId: string;
  claim: ClaimView;
  viewerId: UserId;
};

/**
 * Give back a reservation you hold. Takes the wish and nothing else: the caller
 * has already established that this claim is the viewer's own, so there is no
 * claim state here to render and no name to get wrong.
 */
export function ReleaseClaimButton({ wishId }: { wishId: string }) {
  const { pending, error, run } = useAction();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        loading={pending}
        onClick={() => run(() => unclaimWish(wishId))}
      >
        <UndoIcon />
        Toto nekupujem
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Claim or release an item on someone else's list. Never rendered on your own. */
export function ClaimButton({ wishId, claim, viewerId }: Props) {
  const { pending, error, run } = useAction();

  // Held by somebody else — the same predicate the row dims on, so the two can
  // never disagree. There is nothing to click either way; the only difference is
  // whether this viewer is told who. A claim from a group they are not in must
  // still show as taken, so nobody buys it twice, and must not name its holder.
  if (claimedByOther(claim, viewerId)) {
    return (
      <span className="text-muted-foreground shrink-0">
        {claim.kind === "taken-by"
          ? `Toto kupuje ${claim.by.name}`
          : "Toto už niekto kupuje"}
      </span>
    );
  }

  // Whatever is left and not free is the viewer's own.
  if (claim.kind === "taken-by") {
    return <ReleaseClaimButton wishId={wishId} />;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button loading={pending} onClick={() => run(() => claimWish(wishId))}>
        <GiftIcon />
        Toto kúpim
      </Button>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
