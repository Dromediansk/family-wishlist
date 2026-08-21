"use client";

import { useState, useTransition } from "react";

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
import type { ActionFailure, ActionOutcome } from "@/lib/types";

type Props = {
  /** The control that opens the question. Rendered `asChild`. */
  trigger: React.ReactNode;
  question: string;
  description: React.ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  /** Red belongs on what ends something for other people, not on every bin. */
  confirmVariant?: "default" | "destructive";
  /** Replaces `question` once the action has refused for good. */
  refusedTitle: string;
  action: () => Promise<ActionOutcome>;
};

/**
 * Ask once, then act — and know the difference between a failure and a refusal.
 *
 * A `final` failure cannot be retried into working, so the dialog swaps the way
 * forward for the way out: the reason becomes the description and only
 * **Zavrieť** is left. A non-final failure leaves the question standing, with
 * the error above the buttons and the action still pressable.
 * docs/content/ui-patterns.md#a-refusal-ends-the-dialog
 */
export function ConfirmActionDialog({
  trigger,
  question,
  description,
  confirmLabel,
  cancelLabel,
  confirmVariant,
  refusedTitle,
  action,
}: Props) {
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  const refused = failure?.final === true;

  return (
    <AlertDialog
      onOpenChange={(open) => {
        // The failure belongs to the attempt, not the subject — by the time it
        // is reopened the world may have moved on.
        if (!open) setFailure(null);
      }}
    >
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{refused ? refusedTitle : question}</AlertDialogTitle>
          <AlertDialogDescription role={refused ? "alert" : undefined}>
            {refused ? failure.error : description}
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
          <AlertDialogCancel>{refused ? "Zavrieť" : cancelLabel}</AlertDialogCancel>
          {refused ? null : (
            <AlertDialogAction
              variant={confirmVariant}
              loading={pending}
              onClick={(event) => {
                event.preventDefault(); // keeps the dialog open on failure
                setFailure(null);
                startTransition(async () => {
                  const result = await action();
                  if (result && !result.ok) setFailure(result);
                });
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
