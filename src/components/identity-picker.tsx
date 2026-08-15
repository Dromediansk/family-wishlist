"use client";

import { useState, useTransition } from "react";
import { UserRoundIcon } from "lucide-react";

import { setCurrentMember } from "@/app/actions/identity";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Member } from "@/lib/types";

type Props = {
  members: Pick<Member, "id" | "name">[];
  currentMemberId?: string | null;
  /** Gate mode: no identity chosen yet, so the dialog opens and can't be closed. */
  forced?: boolean;
  trigger?: React.ReactNode;
};

/**
 * "Who are you?" — used both as the opening gate and as the switcher in the
 * header. There are no passwords; this is the trust-based identity the family
 * agreed on.
 */
export function IdentityPicker({
  members,
  currentMemberId,
  forced = false,
  trigger,
}: Props) {
  const [open, setOpen] = useState(forced);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function pick(memberId: string) {
    setError(null);
    setPendingId(memberId);
    startTransition(async () => {
      const result = await setCurrentMember(memberId);
      setPendingId(null);
      if (!result.ok) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (forced && !next) return;
        setOpen(next);
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className="max-w-sm"
        onEscapeKeyDown={(event) => forced && event.preventDefault()}
        onInteractOutside={(event) => forced && event.preventDefault()}
        showCloseButton={!forced}
      >
        <DialogHeader>
          <DialogTitle>Who are you?</DialogTitle>
          <DialogDescription>
            {forced
              ? "Pick your name so we know whose list is whose."
              : "Switch to a different family member."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {members.map((member) => (
            <Button
              key={member.id}
              variant={member.id === currentMemberId ? "default" : "outline"}
              className="justify-start"
              disabled={pendingId !== null}
              onClick={() => pick(member.id)}
            >
              <UserRoundIcon />
              {member.name}
              {member.id === currentMemberId ? (
                <span className="ml-auto text-xs opacity-80">that&apos;s you</span>
              ) : null}
            </Button>
          ))}
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
