"use client";

import { useState, useTransition } from "react";
import { GiftIcon, UndoIcon } from "lucide-react";

import { claimWish, unclaimWish } from "@/app/actions/wishes";
import { Button } from "@/components/ui/button";
import type { UserId } from "@/lib/ids";
import type { ClaimView } from "@/lib/types";

type Props = {
  wishId: string;
  claim: ClaimView;
  viewerId: UserId;
};

/** One transition, one message, for either of the two buttons below. */
function useAction(): {
  pending: boolean;
  error: string | null;
  run: (action: () => Promise<{ ok: boolean; error?: string }>) => void;
} {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return {
    pending,
    error,
    run: (action) => {
      setError(null);
      startTransition(async () => {
        const result = await action();
        if (!result.ok) setError(result.error ?? "Niečo sa pokazilo.");
      });
    },
  };
}

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

  if (claim.kind === "taken-by" && claim.by.id === viewerId) {
    return <ReleaseClaimButton wishId={wishId} />;
  }

  // Taken by someone else in a group this viewer shares — show who, and offer
  // nothing to click.
  if (claim.kind === "taken-by") {
    return (
      <span className="text-muted-foreground shrink-0">
        Toto kupuje {claim.by.name}
      </span>
    );
  }

  // Reserved by somebody in a group this viewer is not in. They must know it is
  // taken, so nobody buys it twice — and must not learn by whom.
  if (claim.kind === "taken") {
    return (
      <span className="text-muted-foreground shrink-0">
        Toto už niekto kupuje
      </span>
    );
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
