import { redirect } from "next/navigation";

import { HistoryPage } from "@/components/history-page";
import { SetupRequired } from "@/components/setup-required";
import { getAccess } from "@/lib/data/access";
import { getGivenBy } from "@/lib/data/fulfilled";
import { SIGNED_OUT_HOME } from "@/lib/routes";
import { isConfigured } from "@/lib/supabase";

export default async function GivenPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect(SIGNED_OUT_HOME);
  if (access.kind === "groupless") redirect("/start");

  const given = await getGivenBy(access.viewer);

  return (
    <HistoryPage
      namespace="given"
      backHref="/buying"
      items={given}
      personKey="ownerName"
      groups={access.viewer.groups}
    />
  );
}
