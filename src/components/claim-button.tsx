"use client";

import { useState, useTransition } from "react";
import { GiftIcon, UndoIcon } from "lucide-react";

import { claimWish, unclaimWish } from "@/app/actions/wishes";
import { Button } from "@/components/ui/button";

type Props = {
  wishId: string;
  /** Null when nobody has claimed it yet. */
  claimedByCurrentMember: boolean;
  claimedByName: string | null;
};

/** Claim or release an item on someone else's list. Never rendered on your own. */
export function ClaimButton({
  wishId,
  claimedByCurrentMember,
  claimedByName,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) setError(result.error ?? "Niečo sa pokazilo.");
    });
  }

  if (claimedByCurrentMember) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => run(() => unclaimWish(wishId))}
        >
          <UndoIcon />
          {pending ? "Ruším…" : "Toto nekupujem"}
        </Button>
        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  // Taken by someone else — show who, and offer nothing to click.
  if (claimedByName) {
    return (
      <span className="text-muted-foreground shrink-0 text-sm">
        Toto kupuje {claimedByName}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        disabled={pending}
        onClick={() => run(() => claimWish(wishId))}
      >
        <GiftIcon />
        {pending ? "Rezervujem…" : "Toto kúpim"}
      </Button>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
