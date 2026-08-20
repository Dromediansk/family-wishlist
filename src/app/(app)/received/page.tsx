import { redirect } from "next/navigation";

import { HistoryPage } from "@/components/history-page";
import { SetupRequired } from "@/components/setup-required";
import { getAccess } from "@/lib/data/access";
import { getReceivedBy } from "@/lib/data/fulfilled";
import { isConfigured } from "@/lib/supabase";

/**
 * What you were given, and by whom.
 *
 * No id in the URL on purpose: the caller is always the owner of what this
 * shows, so there is nothing to guess and no ownership guard to get wrong. This
 * is the one screen that names a giver to the person they gave to, and it may
 * only ever render the caller's own rows.
 * docs/content/privacy-rule.md#when-the-secret-ends
 */
export default async function ReceivedPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "groupless") redirect("/start");

  const viewer = access.viewer;
  const received = await getReceivedBy(viewer);

  return (
    <HistoryPage
      // Own list, read through the first group by join date — the same order the
      // switcher shows. This page spans every group, so no one of them is
      // current here.
      backHref={`/g/${viewer.groups[0].id}/member/${viewer.userId}`}
      backLabel="Môj zoznam"
      title="Čo som dostal"
      description="Splnené želania a kto ti ich daroval."
      emptyText="Zatiaľ si nedostal žiadny darček."
      items={received}
      personLabel="od:"
      personName={(wish) => wish.giverName}
    />
  );
}
