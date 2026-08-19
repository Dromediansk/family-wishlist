import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { FulfilledWish } from "@/lib/types";

type Props = {
  backHref: string;
  backLabel: string;
  title: string;
  description: string;
  emptyText: string;
  items: FulfilledWish[];
  /** "pre:" on what you gave, "od:" on what you were given. */
  personLabel: string;
  personName: (wish: FulfilledWish) => string;
};

/**
 * The shell both history pages wear — the two sides of the same record, so the
 * only differences are the words and which name is read off it.
 * docs/content/history.md#the-two-pages
 */
export function HistoryPage({
  backHref,
  backLabel,
  title,
  description,
  emptyText,
  items,
  personLabel,
  personName,
}: Props) {
  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href={backHref}>
            <ArrowLeftIcon />
            {backLabel}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-balance">{title}</h1>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">{description}</p>
      </div>

      {items.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center">
          {emptyText}
        </Card>
      ) : (
        <Card className="py-2">
          <ul className="flex flex-col">
            {items.map((wish) => (
              <WishRow
                key={wish.id}
                wish={wish}
                actionBeside
                action={
                  <div className="text-muted-foreground flex flex-col items-end gap-1 text-right text-sm">
                    <span>
                      {personLabel} {personName(wish)}
                    </span>
                    <span>{formatDate(wish.fulfilledAt)}</span>
                  </div>
                }
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
