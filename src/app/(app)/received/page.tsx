import { redirect } from "next/navigation";

import { HistoryPage } from "@/components/history-page";
import { SetupRequired } from "@/components/setup-required";
import { getAccess, getReceivedBy } from "@/lib/queries";
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
  if (access.kind === "pending") redirect("/pending");

  const currentMember = access.member;
  const received = await getReceivedBy(currentMember.id);

  return (
    <HistoryPage
      backHref={`/member/${currentMember.id}`}
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
