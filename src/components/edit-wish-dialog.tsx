"use client";

import { useState } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { deleteWish, updateWish } from "@/app/actions/wishes";
import { ConfirmActionDialog } from "@/components/confirm-action-dialog";
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
import type { GroupRef, OwnerWish } from "@/lib/types";
import { wishPhotoUrl } from "@/lib/wishes";

/** Edit and delete controls, shown only on your own list. */
export function EditWishDialog({
  wish,
  groups,
}: {
  wish: OwnerWish;
  groups: readonly GroupRef[];
}) {
  const [open, setOpen] = useState(false);

  /*
   * A tag can name a group the owner has since left or deleted, and the picker
   * only draws a checkbox per current group — a stale id would be selected but
   * invisible, and every save refused with "Neplatná skupina." and no way to
   * clear it. Dropping the stale ones leaves the form saveable; if they are all
   * stale, every current group is a better default than an empty selection.
   */
  const currentGroupIds = new Set(groups.map((group) => group.id));
  const stillValid = wish.groupIds.filter((id) => currentGroupIds.has(id));
  const initialGroupIds =
    stillValid.length > 0 ? stillValid : groups.map((group) => group.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Upraviť ${wish.title}`}>
          <PencilIcon />
        </Button>
      </DialogTrigger>
      {/* `sm:`-qualified, or the width leaks down and un-fullscreens the phone. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upraviť želanie</DialogTitle>
          <DialogDescription>Zmeň podrobnosti tohto želania.</DialogDescription>
        </DialogHeader>
        <WishForm
          initial={{
            title: wish.title,
            description: wish.description ?? "",
            url: wish.url ?? "",
            groupIds: initialGroupIds,
            photo: { kind: "unchanged" },
          }}
          initialPhotoUrl={wishPhotoUrl(wish)}
          groups={groups}
          defaultGroupIds={initialGroupIds}
          submitLabel="Uložiť zmeny"
          onSubmit={(values) => updateWish(wish.id, values)}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteWishButton({ wish }: { wish: OwnerWish }) {
  return (
    <ConfirmActionDialog
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Vymazať ${wish.title}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      }
      question={`Vymazať „${wish.title}“?`}
      refusedTitle={`Nedá sa vymazať „${wish.title}“`}
      description="Natrvalo sa odstráni z tvojho zoznamu."
      confirmLabel="Vymazať"
      cancelLabel="Ponechať"
      action={() => deleteWish(wish.id)}
    />
  );
}
