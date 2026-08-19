import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { ClaimButton } from "@/components/claim-button";
import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccess, getClaimedBy } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function BuyingPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "pending") redirect("/pending");

  const currentMember = access.member;

  // Nothing here can change or vanish underneath you — an owner cannot touch a
  // reserved wish. docs/content/claiming.md#what-im-buying
  const claimed = await getClaimedBy(currentMember.id);

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

      <div>
        <h1 className="text-2xl font-semibold text-balance">Čo kupujem</h1>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">
          Všetko, čo máš rezervované naprieč všetkými zoznamami.
        </p>
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
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-muted-foreground text-sm">
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
