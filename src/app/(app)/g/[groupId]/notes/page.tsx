import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { GroupNoteForm } from "@/components/group-note-form";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { enterGroup } from "@/lib/data/access";
import { getGroupNote } from "@/lib/data/notes";
import { isConfigured } from "@/lib/supabase";

/**
 * One member's private notes for one group. Not admin-only, and not a list
 * anybody else can reach: the note this reads is keyed on the context, so there
 * is no id here for a URL to have chosen.
 */
export default async function NotesPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const { groupId } = await params;

  // The layout asked the same question; a page renders beside its layout rather
  // than after it, so this is the answer that keeps the read scoped.
  const ctx = await enterGroup(groupId);
  if (!ctx) notFound();

  const note = await getGroupNote(ctx);
  const t = await getTranslations("notes");

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href={`/g/${ctx.groupId}`}>
            <ArrowLeftIcon />
            {t("everyone")}
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-balance">{t("title")}</h1>
        {/* Nobody writes an honest gift plan into a box they don't trust. */}
        <p className="text-muted-foreground mt-1 max-w-[62ch]">{t("intro")}</p>
      </div>

      <Card>
        <GroupNoteForm groupId={ctx.groupId} initial={note} />
      </Card>
    </div>
  );
}
