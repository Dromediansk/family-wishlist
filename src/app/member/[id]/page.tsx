import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, EyeOffIcon } from "lucide-react";

import { AddWishDialog } from "@/components/add-wish-dialog";
import { ClaimButton } from "@/components/claim-button";
import { DeleteWishButton, EditWishDialog } from "@/components/edit-wish-dialog";
import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getCurrentMember, getMemberById, getWishListFor } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const { id } = await params;

  const [owner, currentMember] = await Promise.all([
    getMemberById(id),
    getCurrentMember(),
  ]);

  if (!owner) notFound();

  const list = await getWishListFor(owner.id, currentMember?.id ?? null);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-3">
          <Link href="/">
            <ArrowLeftIcon />
            Everyone
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {list.viewerIsOwner ? "My wish list" : `${owner.name}’s wish list`}
          </h1>
          <p className="text-muted-foreground text-sm">
            {list.viewerIsOwner
              ? "Add anything you'd like. You won't be told who picks what."
              : "Claim something so nobody else buys the same thing."}
          </p>
        </div>
        {list.viewerIsOwner ? <AddWishDialog size="default" /> : null}
      </div>

      {list.viewerIsOwner ? (
        <p className="text-muted-foreground flex items-center gap-2 text-xs">
          <EyeOffIcon className="size-3.5 shrink-0" />
          Claims are hidden on your own list — that&apos;s the whole point.
        </p>
      ) : null}

      {list.wishes.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center text-sm">
          {list.viewerIsOwner
            ? "Your list is empty. Add your first wish above."
            : `${owner.name} hasn’t added anything yet.`}
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
                      wish.claimedBy.id !== currentMember?.id
                    }
                    action={
                      currentMember ? (
                        <ClaimButton
                          wishId={wish.id}
                          claimedByCurrentMember={
                            wish.claimedBy?.id === currentMember.id
                          }
                          claimedByName={wish.claimedBy?.name ?? null}
                        />
                      ) : null
                    }
                  />
                ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
