import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, EyeOffIcon } from "lucide-react";

import { AddWishDialog } from "@/components/add-wish-dialog";
import { ClaimButton } from "@/components/claim-button";
import { DeleteWishButton, EditWishDialog } from "@/components/edit-wish-dialog";
import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccess, getMemberById, getWishListFor } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const [{ id }, access] = await Promise.all([params, getAccess()]);

  // Nobody reads a list without being in the family. Guessing this URL used to
  // be enough; now it is checked here, not just on the way in.
  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "pending") redirect("/pending");

  const currentMember = access.member;
  const owner = await getMemberById(id);

  if (!owner) notFound();

  const list = await getWishListFor(owner.id, currentMember.id);

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {list.viewerIsOwner
              ? "Môj zoznam želaní"
              : `Zoznam želaní – ${owner.name}`}
          </h1>
          <p className="text-muted-foreground text-sm">
            {list.viewerIsOwner
              ? "Pridaj si čokoľvek, čo by si chcel. Nedozvieš sa, kto si čo vybral."
              : "Rezervuj si niečo, aby to isté nekúpil ešte niekto ďalší."}
          </p>
        </div>
        {list.viewerIsOwner ? <AddWishDialog size="default" /> : null}
      </div>

      {list.viewerIsOwner ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <EyeOffIcon className="size-3.5 shrink-0" />
          Vo vlastnom zozname sú rezervácie skryté — o to práve ide.
        </p>
      ) : null}

      {list.wishes.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center text-sm">
          {list.viewerIsOwner
            ? "Tvoj zoznam je prázdny. Pridaj si vyššie prvé želanie."
            : "V tomto zozname zatiaľ nie sú žiadne želania."}
        </Card>
      ) : (
        <Card className="py-2">
          <ul className="flex flex-col">
            {list.viewerIsOwner
              ? list.wishes.map((wish) => (
                  <WishRow
                    key={wish.id}
                    wish={wish}
                    action={
                      <div className="flex items-center">
                        <EditWishDialog wish={wish} />
                        <DeleteWishButton wish={wish} />
                      </div>
                    }
                  />
                ))
              : list.wishes.map((wish) => (
                  <WishRow
                    key={wish.id}
                    wish={wish}
                    dimmed={
                      wish.claimedBy !== null &&
                      wish.claimedBy.id !== currentMember.id
                    }
                    action={
                      <ClaimButton
                        wishId={wish.id}
                        claimedByCurrentMember={
                          wish.claimedBy?.id === currentMember.id
                        }
                        claimedByName={wish.claimedBy?.name ?? null}
                      />
                    }
                  />
                ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
