import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon, HistoryIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { ClaimEndings } from "@/components/claim-button";
import { GroupTags } from "@/components/group-tags";
import { SetupRequired } from "@/components/setup-required";
import { WishRow } from "@/components/wish-row";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAccess } from "@/lib/data/access";
import { getClaimedBy } from "@/lib/data/wishes";
import { isConfigured } from "@/lib/supabase";

export default async function BuyingPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "groupless") redirect("/start");

  const viewer = access.viewer;

  // Nothing here can change or vanish underneath you — an owner cannot touch a
  // reserved wish. docs/decisions/wishes-claims-history.md#what-im-buying
  const claimed = await getClaimedBy(viewer);
  const t = await getTranslations("buying");

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href="/">
            <ArrowLeftIcon />
            {t("everyone")}
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-balance">{t("title")}</h1>
          <p className="text-muted-foreground mt-1 max-w-[62ch]">
            {t("description")}
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/buying/history">
            <HistoryIcon />
            {t("history")}
          </Link>
        </Button>
      </div>

      {claimed.length === 0 ? (
        <Card className="text-muted-foreground items-center py-12 text-center">
          {t("empty")}
        </Card>
      ) : (
        <Card className="py-2">
          <ul className="flex flex-col">
            {claimed.map((wish) => (
              <WishRow
                key={wish.id}
                wish={wish}
                tags={
                  <GroupTags groupIds={wish.groupIds} groups={viewer.groups} />
                }
                action={
                  <div className="flex flex-col gap-2 sm:items-end">
                    <span className="text-muted-foreground text-sm">
                      {t("wishedBy", { name: wish.owner.name })}
                    </span>
                    <ClaimEndings
                      wishId={wish.id}
                      title={wish.title}
                      ownerName={wish.owner.name}
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
