"use client";

import { useState } from "react";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

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
import type { GroupRef, OwnerWish, TaggedWish } from "@/lib/types";
import { wishPhotoUrl } from "@/lib/wishes";

/** Edit and delete controls, shown only on your own list. */
export function EditWishDialog({
  wish,
  groups,
}: {
  wish: TaggedWish;
  groups: readonly GroupRef[];
}) {
  const t = useTranslations("wishes.edit");
  const [open, setOpen] = useState(false);

  /*
   * `getWishListFor` has already dropped tags naming a group the owner has
   * since left, which can leave none at all — and the picker only draws a
   * checkbox per current group, so an empty selection would be unsaveable with
   * nothing to un-tick. Every current group is a better default than none.
   */
  const initialGroupIds =
    wish.groupIds.length > 0 ? wish.groupIds : groups.map((group) => group.id);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("trigger", { title: wish.title })}>
          <PencilIcon />
        </Button>
      </DialogTrigger>
      {/* `sm:`-qualified, or the width leaks down and un-fullscreens the phone. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
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
          submitLabel={t("submit")}
          onSubmit={(values) => updateWish(wish.id, values)}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteWishButton({ wish }: { wish: OwnerWish }) {
  const t = useTranslations("wishes.delete");
  return (
    <ConfirmActionDialog
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("trigger", { title: wish.title })}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2Icon />
        </Button>
      }
      question={t("question", { title: wish.title })}
      refusedTitle={t("refusedTitle", { title: wish.title })}
      description={t("description")}
      confirmLabel={t("confirm")}
      cancelLabel={t("cancel")}
      action={() => deleteWish(wish.id)}
    />
  );
}
