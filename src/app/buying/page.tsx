import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

import { ClaimButton } from "@/components/claim-button";
import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getClaimedBy, getCurrentMember } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function BuyingPage() {
  if (!isConfigured()) return <SetupRequired />;

  const currentMember = await getCurrentMember();

  if (!currentMember) {
    return (
      <p className="text-muted-foreground">
        Najprv si na{" "}
        <Link href="/" className="text-primary underline underline-offset-4">
          hlavnej stránke
        </Link>{" "}
        vyber, kto si.
      </p>
    );
  }

  const claimed = await getClaimedBy(currentMember.id);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link href="/">
            <ArrowLeftIcon />
            Všetci
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold">Čo kupujem</h1>
        <p className="text-muted-foreground text-sm">
          Všetko, čo máš rezervované naprieč všetkými zoznamami.
        </p>
      </div>

      {claimed.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center text-sm">
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
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-muted-foreground text-xs">
                      pre: {wish.owner.name}
                    </span>
                    <ClaimButton
                      wishId={wish.id}
                      claimedByCurrentMember
                      claimedByName={currentMember.name}
                    />
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
