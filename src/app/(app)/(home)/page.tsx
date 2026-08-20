import { redirect } from "next/navigation";

import { SetupRequired } from "@/components/setup-required";
import { getAccess } from "@/lib/data/access";
import { isConfigured } from "@/lib/supabase";

/**
 * `/` owns no screen of its own — it decides which group you land in.
 *
 * proxy.ts already bounced signed-out visitors, but that is an optimisation:
 * this is the check that decides, and the groupless case needs the database.
 * docs/content/groups.md
 */
export default async function HomePage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();
  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "groupless") redirect("/start");

  // The first group by join date — the same order the switcher shows.
  redirect(`/g/${access.viewer.groups[0].id}`);
}
