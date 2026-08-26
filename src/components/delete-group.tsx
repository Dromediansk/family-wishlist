"use client";

import { Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

import { deleteGroup } from "@/app/actions/groups";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import type { GroupId } from "@/lib/ids";

/**
 * The end of a group. `deleteGroup` redirects on success, so there is nothing to
 * report back and nothing to close — the dialog goes with the page.
 * docs/decisions/groups-and-invites.md#deleting-a-group
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
  const t = useTranslations("groups.delete");
  return (
    <ConfirmActionDialog
      trigger={
        <Button variant="destructive" className="w-full sm:w-auto">
          <Trash2Icon />
          {t("action")}
        </Button>
      }
      question={t("question", { name: groupName })}
      /* The count sits in brackets on purpose: in Slovak the noun and its verb
         decline differently at 1 / 2-4 / 5+, and a bracket needs neither. It
         reads the same way in English, so the message keeps the shape. */
      description={t("description", { count: memberCount })}
      confirmLabel={t("action")}
      cancelLabel={t("cancel")}
      confirmVariant="destructive"
      refusedTitle={t("refusedTitle")}
      action={() => deleteGroup(groupId)}
    />
  );
}
