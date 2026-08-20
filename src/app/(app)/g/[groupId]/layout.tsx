import { notFound, redirect } from "next/navigation";

import { SetupRequired } from "@/components/setup-required";
import { enterGroup, getAccess } from "@/lib/data/access";
import { isConfigured } from "@/lib/supabase";

/**
 * One membership check for every page under /g/[groupId]. A group id in a URL is
 * a claim; `enterGroup` returns null unless a membership row proves it, and the
 * answer is a 404 rather than a 403 so the URL says nothing about which groups
 * exist. docs/content/groups.md
 *
 * `enterGroup` is memoised per render, so each page asking again costs nothing.
 * Every page under here re-checks for itself all the same: a layout and its page
 * render together, so this one is the friendly redirect rather than the guard.
 */
export default async function GroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ groupId: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();
  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "groupless") redirect("/start");

  const { groupId } = await params;
  if (!(await enterGroup(groupId))) notFound();

  return children;
}
