"use client";

import { useState, useTransition } from "react";
import { PackageCheckIcon } from "lucide-react";

import { fulfilWish } from "@/app/actions/wishes";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { ActionFailure } from "@/lib/types";

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
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const refused = failure?.final === true;

  return (
    <AlertDialog
      onOpenChange={(open) => {
        // The failure belongs to the attempt, not the wish.
        if (!open) setFailure(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <PackageCheckIcon />
          Darované
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {refused ? `„${title}“ sa nedá označiť` : `Darované „${title}“?`}
          </AlertDialogTitle>
          <AlertDialogDescription role={refused ? "alert" : undefined}>
            {refused
              ? failure.error
              : `${ownerName} uvidí, že tento darček je od teba. Želanie zmizne zo zoznamu a späť sa to už vrátiť nedá.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Something that failed but could yet succeed stays a question. */}
        {failure && !refused ? (
          <AlertDialogBody>
            <p className="text-destructive" role="alert">
              {failure.error}
            </p>
          </AlertDialogBody>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>{refused ? "Zavrieť" : "Ešte nie"}</AlertDialogCancel>
          {refused ? null : (
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault(); // keeps the dialog open on failure
                setFailure(null);
                startTransition(async () => {
                  const result = await fulfilWish(wishId);
                  if (!result.ok) setFailure(result);
                });
              }}
            >
              {pending ? "Ukladám…" : "Darované"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
