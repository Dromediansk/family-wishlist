"use client";

import { useState, useTransition } from "react";
import {
  CheckIcon,
  CopyIcon,
  LinkIcon,
  PlusIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";

import { createInvite, revokeInvite } from "@/app/actions/invites";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GroupId } from "@/lib/ids";
import { inviteUsable } from "@/lib/invites";
import type { InviteWithCreator } from "@/lib/types";

/**
 * Every member's own **Pozvať** button on the group grid. Creating an invite
 * needs only membership, never the admin role — the person who wants to add a
 * cousin is usually not the admin. docs/content/groups.md#invites
 */
export function InviteDialog({
  groupId,
  invites,
}: {
  groupId: GroupId;
  invites: InviteWithCreator[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await createInvite(groupId);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setError(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlusIcon />
          Pozvať
        </Button>
      </DialogTrigger>
      {/* `sm:`-qualified, or the width leaks down and un-fullscreens the phone. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pozvať do skupiny</DialogTitle>
          <DialogDescription>
            Kto odkaz otvorí, sa hneď pridá do tejto skupiny. Odkaz platí 30
            dní.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <Button
            onClick={create}
            loading={pending}
            className="w-full sm:w-auto"
          >
            <PlusIcon />
            Vytvoriť pozvánku
          </Button>

          {error ? (
            <p className="text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <InviteList groupId={groupId} invites={invites} />
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setOpen(false)}
          >
            Zavrieť
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The invites themselves, without the dialog around them — reused as-is on
 * `/family`, where `showCreator` names whoever made each one, and an admin may
 * revoke any of them.
 *
 * Nothing here ever offers a revoke control for somebody else's invite unless
 * the viewer is that group's admin: `InviteDialog` only ever passes this its
 * own membership's invites, and `/family` is admin-only to begin with. The
 * predicate the server enforces is `canRevokeInvite`; this list never has to
 * ask it, because both callers already guarantee its answer.
 */
export function InviteList({
  groupId,
  invites,
  showCreator = false,
}: {
  groupId: GroupId;
  invites: InviteWithCreator[];
  showCreator?: boolean;
}) {
  if (invites.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">Zatiaľ žiadne pozvánky.</p>
    );
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
          showCreator={showCreator}
        />
      ))}
    </ul>
  );
}

function InviteRow({
  groupId,
  invite,
  usable,
  showCreator,
}: {
  groupId: GroupId;
  invite: InviteWithCreator;
  usable: boolean;
  showCreator: boolean;
}) {
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
          {showCreator ? `Od: ${invite.createdByName}` : "Pozvánka"}
        </p>
        <p className="text-muted-foreground text-sm">
          {usable
            ? `Použité: ${invite.uses}${
                invite.maxUses !== null ? ` / ${invite.maxUses}` : ""
              }`
            : "Neaktívna"}
        </p>
      </div>

      {usable ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Kopírovať odkaz"
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
                aria-label="Zrušiť pozvánku"
              >
                <Trash2Icon />
              </Button>
            }
            question="Zrušiť túto pozvánku?"
            description="Odkaz prestane fungovať. Kto sa už pridal cezeň, zostáva v skupine."
            confirmLabel="Zrušiť"
            cancelLabel="Nechať"
            refusedTitle="Pozvánku sa nedá zrušiť"
            action={() => revokeInvite(groupId, invite.id)}
          />
        </>
      ) : null}
    </li>
  );
}
