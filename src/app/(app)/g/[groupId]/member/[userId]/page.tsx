import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PackageCheckIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { AddWishDialog } from "@/components/add-wish-dialog";
import { ClaimButton } from "@/components/claim-button";
import {
  DeleteWishButton,
  EditWishDialog,
} from "@/components/edit-wish-dialog";
import { GroupTags } from "@/components/group-tags";
import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { enterGroup } from "@/lib/data/access";
import { getGroupPeerUser } from "@/lib/data/members";
import { getWishListFor } from "@/lib/data/wishes";
import { isConfigured } from "@/lib/supabase";
import { claimedByOther } from "@/lib/visibility";

export default async function MemberPage({
  params,
}: {
  params: Promise<{ groupId: string; userId: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const { groupId, userId } = await params;

  // Nobody reads a list without a membership in the group the URL names.
  const ctx = await enterGroup(groupId);
  if (!ctx) notFound();

  // The id in the URL is a claim, not proof: this is what turns it into a
  // member of this group the viewer is allowed to see, or a 404.
  const owner = await getGroupPeerUser(ctx, userId);
  if (!owner) notFound();

  const list = await getWishListFor(ctx, owner.id);
  const t = await getTranslations("list");

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href={`/g/${ctx.groupId}`}>
            <ArrowLeftIcon />
            {t("everyone")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-balance">
            {list.viewerIsOwner
              ? t("ownTitle")
              : t("peerTitle", { name: owner.name })}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-[62ch]">
            {list.viewerIsOwner ? t("ownIntro") : t("peerIntro")}
          </p>
        </div>
        {list.viewerIsOwner ? (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/received">
                <PackageCheckIcon />
                {t("received")}
              </Link>
            </Button>
            <AddWishDialog
              size="default"
              groups={ctx.groups}
              currentGroupId={ctx.groupId}
            />
          </div>
        ) : null}
      </div>

      {list.wishes.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center">
          {list.viewerIsOwner ? t("ownEmpty") : t("peerEmpty")}
        </Card>
      ) : (
        <Card className="py-2">
          <ul className="flex flex-col">
            {list.viewerIsOwner
              ? list.wishes.map((wish) => (
                  <WishRow
                    key={wish.id}
                    wish={wish}
                    tags={
                      <GroupTags groupIds={wish.groupIds} groups={ctx.groups} />
                    }
                    action={
                      // A gap between two 44px targets, one of which deletes.
                      <div className="flex items-center gap-1">
                        <EditWishDialog wish={wish} groups={ctx.groups} />
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
                    dimmed={claimedByOther(wish.claim, ctx.userId)}
                    action={
                      <ClaimButton
                        wishId={wish.id}
                        claim={wish.claim}
                        viewerId={ctx.userId}
                        title={wish.title}
                        ownerName={owner.name}
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
