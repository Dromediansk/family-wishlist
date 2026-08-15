"use client";

import { useState, useTransition } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";

import { deleteWish, updateWish } from "@/app/actions/wishes";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
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
import type { OwnerWish } from "@/lib/types";

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upraviť želanie</DialogTitle>
          <DialogDescription>Zmeň podrobnosti tohto želania.</DialogDescription>
        </DialogHeader>
        <WishForm
          initial={{
            title: wish.title,
            description: wish.description ?? "",
            url: wish.url ?? "",
          }}
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
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
          <AlertDialogTitle>Vymazať „{wish.title}“?</AlertDialogTitle>
          <AlertDialogDescription>
            Natrvalo sa odstráni z tvojho zoznamu.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel>Ponechať</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await deleteWish(wish.id);
                if (!result.ok) setError(result.error);
              });
            }}
          >
            {pending ? "Mažem…" : "Vymazať"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
