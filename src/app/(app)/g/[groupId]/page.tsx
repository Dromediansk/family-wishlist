import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { GroupNoteDialog } from "@/components/group-note-dialog";
import { MemberCard } from "@/components/member-card";
import { SetupRequired } from "@/components/setup-required";
import { enterGroup } from "@/lib/data/access";
import { getMemberSummaries } from "@/lib/data/members";
import { getGroupNote } from "@/lib/data/notes";
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

  // Independent reads against the same membership — none waits on the others.
  const [members, note, t] = await Promise.all([
    getMemberSummaries(ctx),
    getGroupNote(ctx),
    getTranslations("group"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-semibold text-balance break-words">
            {ctx.groupName}
          </h1>
          <GroupNoteDialog groupId={ctx.groupId} note={note} />
        </div>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">{t("intro")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <MemberCard
            key={member.id}
            groupId={ctx.groupId}
            groups={ctx.groups}
            member={member}
          />
        ))}
      </div>
    </div>
  );
}
