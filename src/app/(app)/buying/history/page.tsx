import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccess, getGivenBy } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default async function GivenPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "pending") redirect("/pending");

  const given = await getGivenBy(access.member.id);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href="/buying">
            <ArrowLeftIcon />
            Čo kupujem
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-balance">Čo som daroval</h1>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">
          Darčeky, ktoré si už odovzdal. Zostávajú tu natrvalo.
        </p>
      </div>

      {given.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center">
          Zatiaľ si nič nedaroval.
        </Card>
      ) : (
        <Card className="py-2">
          <ul className="flex flex-col">
            {given.map((wish) => (
              <WishRow
                key={wish.id}
                wish={wish}
                action={
                  <div className="flex flex-col items-end gap-1 text-sm">
                    <span className="text-muted-foreground">
                      pre: {wish.ownerName}
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
