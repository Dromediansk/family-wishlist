import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, HistoryIcon } from "lucide-react";

import { ClaimButton } from "@/components/claim-button";
import { FulfilWishButton } from "@/components/fulfil-wish-button";
import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccess } from "@/lib/data/access";
import { getClaimedBy } from "@/lib/data/wishes";
import { isConfigured } from "@/lib/supabase";
import type { ClaimView } from "@/lib/types";

export default async function BuyingPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "groupless") redirect("/start");

  const viewer = access.viewer;

  // Nothing here can change or vanish underneath you — an owner cannot touch a
  // reserved wish. docs/content/claiming.md#what-im-buying
  const claimed = await getClaimedBy(viewer);

  /*
   * Every row on this page is one of the viewer's own reservations — that is
   * the query's predicate, not something read off a row. `ClaimButton` matches
   * on the id alone to reach the release control, and renders neither the date
   * nor the name in that branch, so both are left empty rather than invented.
   */
  const ownClaim: ClaimView = {
    kind: "taken-by",
    at: "",
    by: { id: viewer.userId, name: "" },
  };

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href="/">
            <ArrowLeftIcon />
            Všetci
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-balance">Čo kupujem</h1>
          <p className="text-muted-foreground mt-1 max-w-[62ch]">
            Všetko, čo máš rezervované naprieč všetkými zoznamami.
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/buying/history">
            <HistoryIcon />
            História
          </Link>
        </Button>
      </div>

      {claimed.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center">
          Zatiaľ nemáš nič rezervované.
        </Card>
      ) : (
        <Card className="py-2">
          <ul className="flex flex-col">
            {claimed.map((wish) => (
              <WishRow
                key={wish.id}
                wish={wish}
                action={
                  <div className="flex flex-col gap-2 sm:items-end">
                    <span className="text-muted-foreground text-sm">
                      praje si: {wish.owner.name}
                    </span>
                    <div className="flex flex-wrap items-start gap-2 sm:justify-end">
                      <ClaimButton
                        wishId={wish.id}
                        claim={ownClaim}
                        viewerId={viewer.userId}
                      />
                      <FulfilWishButton
                        wishId={wish.id}
                        title={wish.title}
                        ownerName={wish.owner.name}
                      />
                    </div>
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
