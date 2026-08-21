"use client";

import { useState, useTransition } from "react";

import type { ActionOutcome } from "@/lib/types";

/**
 * One transition and one message for a control that calls a single Server
 * Action. The message clears on each attempt, so a retry never shows the last
 * refusal beside a running button.
 *
 * For a dialog that has to tell a *final* refusal from a retryable one, hold on
 * to the whole `ActionFailure` instead — `ConfirmActionDialog` is that shape.
 * docs/content/ui-patterns.md#a-refusal-ends-the-dialog
 */
export function useAction(): {
  pending: boolean;
  error: string | null;
  run: (action: () => Promise<ActionOutcome>) => void;
  /** Forget the last message — for a dialog that closed and may reopen. */
  reset: () => void;
} {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return {
    pending,
    error,
    reset: () => setError(null),
    run: (action) => {
      setError(null);
      startTransition(async () => {
        const result = await action();
        if (result && !result.ok) setError(result.error);
      });
    },
  };
}
