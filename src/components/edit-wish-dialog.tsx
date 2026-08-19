"use client";

import { useState, useTransition } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { deleteWish, updateWish } from "@/app/actions/wishes";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogBody,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { WishForm } from "@/components/wish-form";
import type { ActionFailure, OwnerWish } from "@/lib/types";
import { wishPhotoUrl } from "@/lib/wishes";

/** Edit and delete controls, shown only on your own list. */
export function EditWishDialog({ wish }: { wish: OwnerWish }) {
  const [open, setOpen] = useState(false);

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
            photo: { kind: "unchanged" },
          }}
          initialPhotoUrl={wishPhotoUrl(wish)}
          submitLabel="Uložiť zmeny"
          pendingLabel="Ukladám…"
          onSubmit={(values) => updateWish(wish.id, values)}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteWishButton({ wish }: { wish: OwnerWish }) {
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * A refused delete cannot be retried into working, so the dialog stops asking
   * and turns into the answer.
   * docs/content/ui-patterns.md#a-refusal-ends-the-dialog
   */
  const refused = failure?.final === true;

  return (
    <AlertDialog
      onOpenChange={(open) => {
        // The failure belongs to the attempt, not the wish — by the time it is
        // reopened the reservation may have been released.
        if (!open) setFailure(null);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Vymazať ${wish.title}`}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {refused
              ? `Nedá sa vymazať „${wish.title}“`
              : `Vymazať „${wish.title}“?`}
          </AlertDialogTitle>
          <AlertDialogDescription role={refused ? "alert" : undefined}>
            {refused ? failure.error : "Natrvalo sa odstráni z tvojho zoznamu."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* Something that failed but could yet succeed stays a question. */}
        {failure && !refused ? (
          <AlertDialogBody>
            <p className="text-destructive" role="alert">
              {failure.error}
            </p>
          </AlertDialogBody>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>
            {refused ? "Zavrieť" : "Ponechať"}
          </AlertDialogCancel>
          {refused ? null : (
            <AlertDialogAction
              disabled={pending}
              onClick={(event) => {
                event.preventDefault(); // keeps the dialog open on failure
                setFailure(null);
                startTransition(async () => {
                  const result = await deleteWish(wish.id);
                  if (!result.ok) setFailure(result);
                });
              }}
            >
              {pending ? "Mažem…" : "Vymazať"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
