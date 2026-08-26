"use client";

import { useState } from "react";
import {
  CheckIcon,
  CopyIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { createInvite, revokeInvite } from "@/app/actions/invites";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/use-action";
import type { GroupId } from "@/lib/ids";
import { inviteUsable } from "@/lib/invites";
import type { InviteWithCreator } from "@/lib/types";

/**
 * The "create an invite" button on `/family`. Admin-only, like everything on
 * that page — and it is the page's own `isGroupAdmin` redirect that says so, not
 * this component. docs/decisions/groups-and-invites.md#invites
 */
export function CreateInviteButton({ groupId }: { groupId: GroupId }) {
  const t = useTranslations("invites");
  const { pending, error, run } = useAction();

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={() => run(() => createInvite(groupId))}
        loading={pending}
        className="w-full sm:w-auto"
      >
        <PlusIcon />
        {t("create")}
      </Button>

      {error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Every invite into the group, each named by whoever made it, with a revoke
 * control on all of them. Its only caller is `/family`, which is admin-only, so
 * the predicate the server enforces — `canRevokeInvite` — never has to be asked
 * here: the page already guarantees its answer.
 */
export function InviteList({
  groupId,
  invites,
}: {
  groupId: GroupId;
  invites: InviteWithCreator[];
}) {
  const t = useTranslations("invites");

  if (invites.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("empty")}</p>;
  }

  const now = new Date();

  return (
    <ul className="divide-y">
      {invites.map((invite) => (
        <InviteRow
          key={invite.id}
          groupId={groupId}
          invite={invite}
          usable={inviteUsable(invite, now)}
        />
      ))}
    </ul>
  );
}

function InviteRow({
  groupId,
  invite,
  usable,
}: {
  groupId: GroupId;
  invite: InviteWithCreator;
  usable: boolean;
}) {
  const t = useTranslations("invites");
  const common = useTranslations("common");
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/join/${invite.token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <li className="flex items-center gap-3 py-3">
      <LinkIcon className="text-muted-foreground size-5 shrink-0" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">
          {t("from", { name: invite.createdByName })}
        </p>
        <p className="text-muted-foreground text-sm">
          {usable
            ? t("uses", {
                count:
                  invite.maxUses !== null
                    ? `${invite.uses} / ${invite.maxUses}`
                    : invite.uses,
              })
            : t("inactive")}
        </p>
      </div>

      {usable ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={t("copyLink")}
            onClick={copy}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>

          <ConfirmActionDialog
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label={t("revoke")}
              >
                <Trash2Icon />
              </Button>
            }
            question={t("revokeQuestion")}
            description={t("revokeDescription")}
            confirmLabel={common("cancel")}
            cancelLabel={t("revokeKeep")}
            refusedTitle={t("revokeRefused")}
            action={() => revokeInvite(groupId, invite.id)}
          />
        </>
      ) : null}
    </li>
  );
}
