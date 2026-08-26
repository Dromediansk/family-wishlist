import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { ArchivedGroupTags } from "@/components/group-tags";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { FulfilledWish, GroupRef } from "@/lib/types";

type Props = {
  /**
   * Which side of the record this is. The two namespaces carry the same five
   * keys, so naming one is the whole of the difference in wording — passing the
   * sentences in as props would only be this lookup, done twice, further away.
   */
  namespace: "given" | "received";
  backHref: string;
  items: FulfilledWish[];
  /** Whose name the row shows: the giver's on what you were given, and back. */
  personKey: "ownerName" | "giverName";
  /** The viewer's own groups, for the badge rule. Not the record's. */
  groups: readonly GroupRef[];
};

/**
 * The shell both history pages wear — the two sides of the same record, so the
 * only differences are the words and which name is read off it.
 * docs/decisions/wishes-claims-history.md#the-two-pages
 */
export function HistoryPage({
  namespace,
  backHref,
  items,
  personKey,
  groups,
}: Props) {
  const t = useTranslations(namespace);
  const locale = useLocale();
  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href={backHref}>
            <ArrowLeftIcon />
            {t("back")}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-balance">{t("title")}</h1>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">
          {t("description")}
        </p>
      </div>

      {items.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center">
          {t("empty")}
        </Card>
      ) : (
        <Card className="py-2">
          <ul className="flex flex-col">
            {items.map((wish) => (
              <WishRow
                key={wish.id}
                wish={wish}
                tags={
                  <ArchivedGroupTags
                    names={wish.groupNames}
                    groups={groups}
                  />
                }
                actionBeside
                action={
                  <div className="text-muted-foreground flex flex-col items-end gap-1 text-right text-sm">
                    <span>
                      {t("personLabel")} {wish[personKey]}
                    </span>
                    <span>{formatDate(wish.fulfilledAt, locale)}</span>
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
