"use client";

import { Trash2Icon } from "lucide-react";

import { deleteGroup } from "@/app/actions/groups";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import type { GroupId } from "@/lib/ids";

/**
 * The end of a group, and the only red button in the app.
 *
 * It holds no state: `deleteGroup` redirects on success, so there is nothing to
 * report back and nothing to close — the dialog goes with the page.
 * docs/content/groups.md#deleting-a-group
 */
export function DeleteGroupButton({
  groupId,
  groupName,
  memberCount,
}: {
  groupId: GroupId;
  groupName: string;
  memberCount: number;
}) {
  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="destructive" className="w-full sm:w-auto">
          <Trash2Icon />
          Vymazať skupinu
        </Button>
      }
      question={`Vymazať skupinu „${groupName}“?`}
      /* The count sits in brackets on purpose: 2–4 členovia and 5+ členov
         decline differently, and a bracket needs no third plural form. */
      description={
        `Prístup k nej stratia všetci jej členovia (${memberCount}) a pozvánky ` +
        `prestanú platiť. Rezervácie, ktoré existovali len vďaka tejto skupine, ` +
        `sa uvoľnia. Želania a história o darovaní zostávajú — patria ľuďom, ` +
        `nie skupine. Vrátiť sa to nedá.`
      }
      confirmLabel="Vymazať skupinu"
      cancelLabel="Nechať"
      confirmVariant="destructive"
      refusedTitle="Skupinu sa nedá vymazať"
      action={() => deleteGroup(groupId)}
    />
  );
}
