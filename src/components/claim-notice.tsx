"use client";

import { useState, useTransition } from "react";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";

import { dismissNotice } from "@/app/actions/notices";
import { Button } from "@/components/ui/button";
import type { BuyingItem, WishChange } from "@/lib/types";

const FIELD_LABEL: Record<WishChange["field"], string> = {
  title: "Názov",
  description: "Popis",
  url: "Odkaz",
};

/**
 * The "something happened to this" block on Čo kupujem, and the button that
 * makes it go away.
 *
 * Renders nothing for a claim nobody touched, so the page can hand it every row
 * without asking. Only ever shown to the person doing the buying — the owner of
 * the list has no equivalent of this component and must never get one, since
 * being told their wish was reserved is what this app exists to prevent.
 */
export function ClaimNotice({ item }: { item: BuyingItem }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const noticeId =
    item.kind === "cancelled" ? item.noticeId : item.change?.noticeId;

  if (!noticeId) return null;

  function dismiss(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await dismissNotice(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="border-muted-foreground/25 bg-muted/40 mt-3 rounded-md border border-dashed p-3">
      <div className="flex gap-2">
        <TriangleAlertIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2 text-sm">
          {item.kind === "cancelled" ? (
            <>
              <p>{item.ownerName} túto položku odstránil zo svojho zoznamu.</p>
              <p className="text-muted-foreground text-xs">
                Ak si ju už kúpil, ozvi sa mu.
              </p>
            </>
          ) : (
            <>
              <p>{item.ownerName} túto položku zmenil:</p>
              <dl className="space-y-2">
                {item.change?.fields.map((change) => (
                  <div key={change.field} className="space-y-0.5">
                    <dt className="text-muted-foreground text-xs">
                      {FIELD_LABEL[change.field]}
                    </dt>
                    <dd className="text-muted-foreground text-xs break-words">
                      <span className="line-through">
                        {change.before ?? "—"}
                      </span>
                    </dd>
                    <dd className="break-words">{change.after ?? "—"}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-muted-foreground text-xs">
                Skontroluj, či ešte kupuješ to správne.
              </p>
            </>
          )}
        </div>
      </div>
      <div className="mt-3 flex flex-col items-end gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => dismiss(noticeId)}
        >
          <CheckIcon />
          {pending ? "Zatváram…" : "Rozumiem"}
        </Button>
        {error ? (
          <p className="text-destructive text-xs" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
