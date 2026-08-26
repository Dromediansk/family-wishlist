import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { HistoryPage } from "@/components/history-page";
import { SetupRequired } from "@/components/setup-required";
import { getAccess } from "@/lib/data/access";
import { getGivenBy } from "@/lib/data/fulfilled";
import { isConfigured } from "@/lib/supabase";

export default async function GivenPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "groupless") redirect("/start");

  const given = await getGivenBy(access.viewer);
  const t = await getTranslations("given");

  return (
    <HistoryPage
      backHref="/buying"
      backLabel={t("back")}
      title={t("title")}
      description={t("description")}
      emptyText={t("empty")}
      items={given}
      personLabel={t("personLabel")}
      personName={(wish) => wish.ownerName}
      groups={access.viewer.groups}
    />
  );
}
