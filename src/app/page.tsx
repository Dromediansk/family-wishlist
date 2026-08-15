import Link from "next/link";
import { ShoppingBagIcon, UserRoundIcon } from "lucide-react";

import { FirstRun } from "@/components/first-run";
import { IdentityPicker } from "@/components/identity-picker";
import { ManageMembers } from "@/components/manage-members";
import { MemberCard } from "@/components/member-card";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import { getCurrentMember, getMembers } from "@/lib/queries";
import { isConfigured } from "@/lib/supabase";

export default async function HomePage() {
  if (!isConfigured()) return <SetupRequired />;

  const [members, currentMember] = await Promise.all([
    getMembers(),
    getCurrentMember(),
  ]);

  if (members.length === 0) return <FirstRun />;

  // Cookie missing, or pointing at someone who has since been removed.
  if (!currentMember) {
    return (
      <>
        <IdentityPicker members={members} forced />
        <p className="text-muted-foreground">
          Vyber si svoje meno a môžeme začať.
        </p>
      </>
    );
  }

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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/buying">
              <ShoppingBagIcon />
              Čo kupujem
            </Link>
          </Button>
          {currentMember.role === "admin" ? (
            <ManageMembers members={members} />
          ) : null}
          <IdentityPicker
            members={members}
            currentMemberId={currentMember.id}
            trigger={
              <Button variant="ghost" size="sm">
                <UserRoundIcon />
                {currentMember.name}
              </Button>
            }
          />
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
