import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon, PackageCheckIcon } from "lucide-react";

import { AddWishDialog } from "@/components/add-wish-dialog";
import { ClaimButton } from "@/components/claim-button";
import {
  DeleteWishButton,
  EditWishDialog,
} from "@/components/edit-wish-dialog";
import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { enterGroup, getAccess } from "@/lib/data/access";
import { getPeerUser } from "@/lib/data/members";
import { getWishListFor } from "@/lib/data/wishes";
import { isConfigured } from "@/lib/supabase";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const [{ id }, access] = await Promise.all([params, getAccess()]);

  // Nobody reads a list without a session, and the URL is guessable.
  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "groupless") redirect("/start");

  const viewer = access.viewer;
  const ctx = await enterGroup(viewer.groups[0].id);
  if (!ctx) notFound();

  // The id in the URL is a claim, not proof: this is what turns it into a
  // person the viewer is allowed to see, or a 404.
  const owner = await getPeerUser(viewer, id);
  if (!owner) notFound();

  const list = await getWishListFor(viewer, owner.id, ctx.groupId);

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
          <h1 className="text-2xl font-semibold text-balance">
            {list.viewerIsOwner
              ? "Môj zoznam želaní"
              : `Toto si praje ${owner.name}`}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-[62ch]">
            {list.viewerIsOwner
              ? "Pridaj si čokoľvek, čo by si chcel. Nedozvieš sa, kto si čo vybral."
              : "Rezervuj si to, aby to nekúpil ešte niekto ďalší."}
          </p>
        </div>
        {list.viewerIsOwner ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/received">
                <PackageCheckIcon />
                Čo som dostal
              </Link>
            </Button>
            <AddWishDialog size="default" />
          </div>
        ) : null}
      </div>

      {list.wishes.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center">
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
                      // A gap between two 44px targets, one of which deletes.
                      <div className="flex items-center gap-1">
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
                    // Anything somebody else holds dims down, whether or not
                    // this viewer is told who that somebody is.
                    dimmed={
                      wish.claim.kind === "taken" ||
                      (wish.claim.kind === "taken-by" &&
                        wish.claim.by.id !== viewer.userId)
                    }
                    action={
                      <ClaimButton
                        wishId={wish.id}
                        claim={wish.claim}
                        viewerId={viewer.userId}
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
