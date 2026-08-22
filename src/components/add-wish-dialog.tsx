"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { addWish } from "@/app/actions/wishes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WishForm } from "@/components/wish-form";
import type { GroupId } from "@/lib/ids";
import type { GroupRef } from "@/lib/types";

type Props = {
  groups: readonly GroupRef[];
  currentGroupId: GroupId;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
  className?: string;
};

/**
 * Always adds to the current member's own list — the server takes the owner
 * from the cookie, never from anything this component sends.
 */
export function AddWishDialog({
  groups,
  currentGroupId,
  variant = "default",
  size = "default",
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <PlusIcon />
          Pridať želanie
        </Button>
      </DialogTrigger>
      {/* `sm:`-qualified, or the width leaks down and un-fullscreens the phone. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pridať želanie</DialogTitle>
          <DialogDescription>
            Pridá sa do tvojho vlastného zoznamu.
          </DialogDescription>
        </DialogHeader>
        <WishForm
          groups={groups}
          defaultGroupIds={[currentGroupId]}
          submitLabel="Pridať želanie"
          onSubmit={(values) => addWish(values)}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
