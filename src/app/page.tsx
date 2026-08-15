import Link from "next/link";
import { redirect } from "next/navigation";
import { ShoppingBagIcon, UserRoundIcon } from "lucide-react";

import { ManageMembers } from "@/components/manage-members";
import { MemberCard } from "@/components/member-card";
import { SetupRequired } from "@/components/setup-required";
import { SignOutButton } from "@/components/sign-out-button";
import { Button } from "@/components/ui/button";
import { getAccess, getMemberAccounts, getMembers } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function HomePage() {
  if (!isConfigured()) return <SetupRequired />;

  const access = await getAccess();

  // proxy.ts sends signed-out visitors to /login before a render ever starts.
  // This is the check that actually decides, though — the proxy is an
  // optimisation, and the pending case needs the database anyway.
  if (access.kind === "anonymous") redirect("/login");
  if (access.kind === "pending") redirect("/pending");

  const currentMember = access.member;
  const isAdmin = currentMember.role === "admin";

  const [members, accounts] = await Promise.all([
    getMembers(),
    // Only an admin has an approval queue to look at, so only an admin pays for
    // the query — and nobody else's browser receives the email addresses in it.
    isAdmin ? getMemberAccounts() : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Rodina</h1>
          <p className="text-muted-foreground text-sm">
            Pridaj si niečo do vlastného zoznamu alebo si vyber, čo kúpiš
            niekomu inému.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/buying">
              <ShoppingBagIcon />
              Čo kupujem
            </Link>
          </Button>
          {isAdmin ? (
            <ManageMembers members={members} accounts={accounts} />
          ) : null}
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <UserRoundIcon className="size-4" />
            {currentMember.name}
          </span>
          <SignOutButton variant="ghost" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            member={member}
            isCurrentMember={member.id === currentMember.id}
          />
        ))}
      </div>
    </div>
  );
}
