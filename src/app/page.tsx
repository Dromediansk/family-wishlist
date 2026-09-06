import { redirect } from "next/navigation";

import { Landing } from "@/components/landing/landing";
import { SetupRequired } from "@/components/setup-required";
import { getAccess } from "@/lib/data/access";
import { safeReturnTo } from "@/lib/invites";
import { isConfigured } from "@/lib/supabase";

/**
 * The front door, and the only screen a stranger can reach: sign in here, or be
 * sent on to wherever a session already belongs.
 *
 * Both jobs are one page on purpose. Split across `/` and `/login` they cost a
 * new visitor two round trips to reach the one screen they can use, and the
 * pair had to agree about which of them redirected where.
 *
 * proxy.ts already bounced signed-out visitors here, but that is an
 * optimisation: this is the check that decides, and the groupless case needs
 * the database. docs/decisions/groups-and-invites.md
 *
 * The sign-in card became a landing page — what the app does, three steps of
 * how, and the way in twice. The design lives in `src/components/landing/`.
 * docs/superpowers/specs/2026-09-06-landing-page-design.md
 */
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; returnTo?: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const [params, access] = await Promise.all([searchParams, getAccess()]);
  const { error } = params;

  /*
   * `/join/{token}` sends a signed-out visitor here with the link it could not
   * open yet. The value comes off a query string, so it is checked before it is
   * rendered, let alone redirected to — anything else is dropped and this page
   * behaves as if it never arrived. docs/decisions/groups-and-invites.md#invites
   */
  const returnTo = safeReturnTo(params.returnTo);

  /*
   * Already signed in: the invite first, then where they belong. This ladder has
   * to end somewhere other than `/` — falling back to it would be a redirect to
   * this very page, and the browser would loop.
   */
  if (access.kind !== "anonymous") {
    if (returnTo) redirect(returnTo);
    if (access.kind === "groupless") redirect("/start");
    // The first group by join date — the same order the switcher shows.
    redirect(`/g/${access.viewer.groups[0].id}`);
  }

  return <Landing returnTo={returnTo} error={error} />;
}
