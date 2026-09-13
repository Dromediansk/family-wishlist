import Link from "next/link";
import { notFound } from "next/navigation";
import { NotebookPenIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { MemberCard } from "@/components/member-card";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import { enterGroup } from "@/lib/data/access";
import { getMemberSummaries } from "@/lib/data/members";
import { hasGroupNote } from "@/lib/data/notes";
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

  // Independent reads against the same membership — neither waits on the other.
  const [members, hasNote] = await Promise.all([
    getMemberSummaries(ctx),
    hasGroupNote(ctx),
  ]);
  const t = await getTranslations("group");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-balance break-words">
            {ctx.groupName}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-[62ch]">
            {t("intro")}
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/g/${ctx.groupId}/notes`}>
            <NotebookPenIcon />
            {t("notes")}
            {/*
             * A mark, not a count: the page says whether there is anything to
             * come back to, and the note itself says how much.
             */}
            {hasNote ? (
              <>
                <span className="bg-primary size-1.5 rounded-full" aria-hidden />
                <span className="sr-only">{t("notesFilled")}</span>
              </>
            ) : null}
          </Link>
        </Button>
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
