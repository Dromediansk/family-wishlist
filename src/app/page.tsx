import { redirect } from "next/navigation";

import { MemberCard } from "@/components/member-card";
import { SetupRequired } from "@/components/setup-required";
import { getAccess, getMemberSummaries } from "@/lib/queries";
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
  // The viewer's id is what decides whose availability count is withheld.
  const members = await getMemberSummaries(currentMember.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Rodina</h1>
        <p className="text-muted-foreground text-sm">
          Pridaj si niečo do vlastného zoznamu alebo si vyber, čo kúpiš niekomu
          inému.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}
