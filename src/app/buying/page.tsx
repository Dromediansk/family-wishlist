import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { ClaimNotice } from "@/components/claim-notice";
import { ClaimButton } from "@/components/claim-button";
import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toBuyingItems } from "@/lib/notices";
import { getAccess, getClaimedBy, getNoticesFor } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function BuyingPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "pending") redirect("/pending");

  const currentMember = access.member;

  const [claimed, notices] = await Promise.all([
    getClaimedBy(currentMember.id),
    getNoticesFor(currentMember.id),
  ]);

  // Cancellations and rewrites sort to the top; see toBuyingItems.
  const items = toBuyingItems(claimed, notices);

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

      {items.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center">
          Zatiaľ nemáš nič rezervované.
        </Card>
      ) : (
        <Card className="py-2">
          <ul className="flex flex-col">
            {/*
             * One row shape for both halves. A cancelled row is dimmed and has
             * nothing left to release — the wish it described is already gone —
             * but is otherwise the same row, so it renders through the same
             * call rather than a near-copy that drifts.
             */}
            {items.map((item) => (
              <WishRow
                key={item.key}
                wish={item.wish}
                dimmed={item.kind === "cancelled"}
                action={
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-muted-foreground text-sm">
                      pre: {item.ownerName}
                    </span>
                    {item.kind === "active" ? (
                      <ClaimButton
                        wishId={item.wish.id}
                        claimedByCurrentMember
                        claimedByName={currentMember.name}
                      />
                    ) : null}
                  </div>
                }
                footer={<ClaimNotice item={item} />}
              />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
