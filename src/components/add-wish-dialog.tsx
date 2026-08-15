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
  size = "sm",
  className,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <PlusIcon />
          Add wish
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a wish</DialogTitle>
          <DialogDescription>
            This goes on your own list. You won&apos;t be told if someone claims
            it.
          </DialogDescription>
        </DialogHeader>
        <WishForm
          submitLabel="Add wish"
          pendingLabel="Adding…"
          onSubmit={(values) => addWish(values)}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
