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

type Props = {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
  className?: string;
};

/**
 * Always adds to the current member's own list — the server takes the owner
 * from the cookie, never from anything this component sends.
 */
export function AddWishDialog({
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pridať želanie</DialogTitle>
          <DialogDescription>
            Pridá sa do tvojho vlastného zoznamu. Nedozvieš sa, či si ho niekto
            rezervoval.
          </DialogDescription>
        </DialogHeader>
        <WishForm
          submitLabel="Pridať želanie"
          pendingLabel="Pridávam…"
          onSubmit={(values) => addWish(values)}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
