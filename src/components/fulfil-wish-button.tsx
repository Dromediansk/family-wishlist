"use client";

import { PackageCheckIcon } from "lucide-react";

import { fulfilWish } from "@/app/actions/wishes";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";

/**
 * Hand-over, one way. This is the only control in the app that ends a secret:
 * it deletes the wish from its owner's list and writes a record naming the
 * giver to them. docs/content/privacy-rule.md#when-the-secret-ends
 *
 * The second sentence of the description is the whole safety mechanism — the
 * only place the buyer is told that pressing this reveals them — so it says so
 * plainly rather than politely.
 */
export function FulfilWishButton({
  wishId,
  title,
  ownerName,
}: {
  wishId: string;
  title: string;
  ownerName: string;
}) {
  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="outline">
          <PackageCheckIcon />
          Darované
        </Button>
      }
      question={`Darované „${title}“?`}
      refusedTitle={`„${title}“ sa nedá označiť`}
      description={`${ownerName} uvidí, že tento darček je od teba. Želanie zmizne zo zoznamu a späť sa to už vrátiť nedá.`}
      confirmLabel="Darované"
      cancelLabel="Ešte nie"
      action={() => fulfilWish(wishId)}
    />
  );
}
