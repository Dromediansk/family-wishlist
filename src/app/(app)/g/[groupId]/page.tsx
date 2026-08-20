import { notFound } from "next/navigation";

import { InviteDialog } from "@/components/invite-dialog";
import { MemberCard } from "@/components/member-card";
import { SetupRequired } from "@/components/setup-required";
import { enterGroup } from "@/lib/data/access";
import { listMyInvites } from "@/lib/data/invites";
import { getMemberSummaries } from "@/lib/data/members";
import { isConfigured } from "@/lib/supabase";

/** One group's grid. Nobody else's members are reachable from here. */
export default async function GroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const { groupId } = await params;

  // The layout asked the same question; a page renders beside its layout rather
  // than after it, so this is the answer that keeps the query scoped.
  const ctx = await enterGroup(groupId);
  if (!ctx) notFound();

  const [members, myInvites] = await Promise.all([
    getMemberSummaries(ctx),
    listMyInvites(ctx),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between gap-4">
          <h1 className="min-w-0 text-2xl font-semibold text-balance break-words">
            {ctx.groupName}
          </h1>
          {/* The button keeps its width; a long group name wraps instead. */}
          <div className="shrink-0">
            <InviteDialog groupId={ctx.groupId} invites={myInvites} />
          </div>
        </div>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">
          Pridaj si niečo do vlastného zoznamu alebo si vyber, čo kúpiš niekomu
          inému.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <MemberCard key={member.id} groupId={ctx.groupId} member={member} />
        ))}
      </div>
    </div>
  );
}
