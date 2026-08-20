import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { ManageMembers } from "@/components/manage-members";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import { isGroupAdmin } from "@/lib/access";
import { enterGroup, getAccess } from "@/lib/data/access";
import { getGroupMembers } from "@/lib/data/members";
import { isConfigured } from "@/lib/supabase";

export default async function FamilyPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "groupless") redirect("/start");

  const viewer = access.viewer;
  const ctx = await enterGroup(viewer.groups[0].id);
  if (!ctx) notFound();

  // The menu item is hidden from non-admins, but the URL is guessable. Every
  // action on the page re-checks for itself as well.
  if (!isGroupAdmin(ctx)) redirect("/");

  const members = await getGroupMembers(ctx);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href="/">
            <ArrowLeftIcon />
            Všetci
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-balance">
          Správa členov rodiny
        </h1>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">
          Premenúvaj ľudí alebo meň, kto môže spravovať tento zoznam.
        </p>
      </div>

      <ManageMembers members={members} />
    </div>
  );
}
