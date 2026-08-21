import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { CreateInviteButton, InviteList } from "@/components/invites";
import { ManageMembers } from "@/components/manage-members";
import { SetupRequired } from "@/components/setup-required";
import { Button } from "@/components/ui/button";
import { isGroupAdmin } from "@/lib/visibility";
import { enterGroup } from "@/lib/data/access";
import { listGroupInvites } from "@/lib/data/invites";
import { getGroupMembers } from "@/lib/data/members";
import { isConfigured } from "@/lib/supabase";

export default async function FamilyPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  if (!isConfigured()) return <SetupRequired />;

  const { groupId } = await params;

  const ctx = await enterGroup(groupId);
  if (!ctx) notFound();

  // The menu item is hidden from non-admins, but the URL is guessable, and an
  // admin of one group is nobody in another. Every action on the page re-checks
  // for itself as well.
  if (!isGroupAdmin(ctx)) redirect(`/g/${ctx.groupId}`);

  const [members, invites] = await Promise.all([
    getGroupMembers(ctx),
    listGroupInvites(ctx),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-4">
          <Link href={`/g/${ctx.groupId}`}>
            <ArrowLeftIcon />
            Všetci
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-balance">
          Správa skupiny {ctx.groupName}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-[62ch]">
          Pozvi niekoho nového, premenúvaj ľudí alebo meň, kto môže spravovať
          tento zoznam.
        </p>
      </div>

      <ManageMembers groupId={ctx.groupId} members={members} />

      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-balance">Pozvánky</h2>
          <p className="text-muted-foreground max-w-[62ch]">
            Kto odkaz otvorí, sa hneď pridá do tejto skupiny. Odkaz platí 24 hodín.
          </p>
        </div>
        <CreateInviteButton groupId={ctx.groupId} />
        <InviteList groupId={ctx.groupId} invites={invites} />
      </div>
    </div>
  );
}
