import { redirect } from "next/navigation";

import { MarketingPage } from "@/components/marketing-page";
import { SetupRequired } from "@/components/setup-required";
import { getAccess } from "@/lib/data/access";
import { isConfigured } from "@/lib/supabase";

/**
 * What `/` and `/en` both do: show a stranger what the app is, and send anybody
 * with a session where they were actually going.
 *
 * `/` used to own no screen at all — it redirected a signed-out visitor to
 * `/login`, which left the app's most valuable URL serving a 307 to a login
 * card. It answers for itself now; the two signed-in branches are unchanged.
 *
 * `proxy.ts` no longer bounces anonymous visitors from these two paths, but
 * that was always an optimisation: this is the check that decides, and the
 * groupless case needs the database. docs/decisions/groups-and-invites.md
 */
export async function Landing() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();
  if (access.kind === "anonymous") return <MarketingPage />;
  if (access.kind === "groupless") redirect("/start");

  // The first group by join date — the same order the switcher shows.
  redirect(`/g/${access.viewer.groups[0].id}`);
}
