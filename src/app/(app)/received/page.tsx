import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccess, getReceivedBy } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

/**
 * What you were given, and by whom.
 *
 * No id in the URL on purpose: the caller is always the owner of what this
 * shows, so there is nothing to guess and no ownership guard to get wrong. This
 * is the one screen that names a giver to the person they gave to, and it may
 * only ever render the caller's own rows.
 * docs/content/privacy-rule.md#when-the-secret-ends
 */
export default async function ReceivedPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "pending") redirect("/pending");

  const currentMember = access.member;
  const received = await getReceivedBy(currentMember.id);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href={`/member/${currentMember.id}`}>
            <ArrowLeftIcon />
            Môj zoznam
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-balance">Čo som dostal</h1>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">
          Splnené želania a kto ti ich daroval.
        </p>
      </div>

      {received.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center">
          Zatiaľ si nedostal žiadny darček.
        </Card>
      ) : (
        <Card className="py-2">
          <ul className="flex flex-col">
            {received.map((wish) => (
              <WishRow
                key={wish.id}
                wish={wish}
                action={
                  <div className="flex flex-col items-end gap-1 text-sm">
                    <span className="text-muted-foreground">
                      od: {wish.giverName}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(wish.fulfilledAt)}
                    </span>
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
