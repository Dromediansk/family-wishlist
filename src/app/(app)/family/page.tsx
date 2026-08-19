import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { ManageMembers } from "@/components/manage-members";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import { isAdmin } from "@/lib/access";
import { getAccess, getMemberAccounts, getMembers } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function FamilyPage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "pending") redirect("/pending");

  // The menu item is hidden from non-admins, but the URL is guessable. Every
  // action on the page re-checks for itself as well.
  if (!isAdmin(access.member)) redirect("/");

  const [members, accounts] = await Promise.all([
    getMembers(),
    // Email addresses reach an admin's browser and nobody else's.
    getMemberAccounts(),
  ]);

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
          Púšťaj dnu nových ľudí, premenúvaj ich alebo meň, kto môže spravovať
          tento zoznam.
        </p>
      </div>

      <ManageMembers members={members} accounts={accounts} />
    </div>
  );
}
