import { redirect } from "next/navigation";

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

  return (
    <HistoryPage
      backHref="/buying"
      backLabel="Čo kupujem"
      title="Čo som daroval"
      description="Darčeky, ktoré si už odovzdal. Zostávajú tu natrvalo."
      emptyText="Zatiaľ si nič nedaroval."
      items={given}
      personLabel="pre:"
      personName={(wish) => wish.ownerName}
    />
  );
}
