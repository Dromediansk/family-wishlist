import { redirect } from "next/navigation";

import { HistoryPage } from "@/components/history-page";
import { SetupRequired } from "@/components/setup-required";
import { getAccess, getGivenBy } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function GivenPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "pending") redirect("/pending");

  const given = await getGivenBy(access.member.id);

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
