"use client";

import { useState } from "react";
import { NotebookPenIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { saveGroupNote } from "@/app/actions/notes";
import { SubmitButton } from "@/components/submit-button";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupId } from "@/lib/ids";
import { MAX_NOTE_LENGTH } from "@/lib/notes";
import type { ActionFailure } from "@/lib/types";

/** Names both the form field and the label that points at it. */
const FIELD = "note-body";

/**
 * One member's private notebook for one group, opened from the group's heading.
 *
 * The note arrives as a prop rather than being read here: the group page needs
 * it anyway to decide whether to mark the trigger, so one read serves both.
 *
 * The textarea is uncontrolled — nothing here needs to read what is being typed
 * before it is submitted, and leaving it uncontrolled is what keeps the text the
 * author is mid-sentence on from being replaced when the page underneath
 * revalidates.
 */
export function GroupNoteDialog({
  groupId,
  note,
}: {
  groupId: GroupId;
  note: string;
}) {
  const t = useTranslations("notes");
  const [open, setOpen] = useState(false);

  // Only the failed half is worth holding on to, as in `wish-form`.
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  async function submit(formData: FormData) {
    const result = await saveGroupNote(
      groupId,
      String(formData.get(FIELD) ?? ""),
    );
    if (result.ok) {
      // Success needs no marker of its own — it closes the dialog.
      setOpen(false);
      return;
    }
    setFailure(result);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // A closed dialog keeps no refusal to greet the next attempt with.
        if (!next) setFailure(null);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="shrink-0">
          <NotebookPenIcon />
          {/*
           * Icon alone on a narrow screen, like the header's own entries — but
           * the label stays in the accessible name rather than moving to an
           * `aria-label`, which would swallow the mark below.
           */}
          <span className="sr-only sm:not-sr-only">{t("title")}</span>
          {/*
           * A mark, not a count: the button says whether there is anything to
           * come back to, and the note itself says how much.
           */}
          {note !== "" ? (
            <>
              <span className="bg-primary size-1.5 rounded-full" aria-hidden />
              <span className="sr-only">{t("filled")}</span>
            </>
          ) : null}
        </Button>
      </DialogTrigger>
      {/* `sm:`-qualified, or the width leaks down and un-fullscreens the phone. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          {/* Nobody writes an honest gift plan into a box they don't trust. */}
          <DialogDescription>{t("intro")}</DialogDescription>
        </DialogHeader>
        {/*
         * The form *is* the body and footer, not a block inside them, so the box
         * takes the room going spare while the button stays pinned to the bottom
         * edge. docs/decisions/ui-patterns.md#three-things-that-will-bite
         */}
        <form action={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="flex flex-col gap-4">
            {/*
             * The one field grows into the panel instead of leaving dead space
             * below it — a full-screen phone dialog is mostly this box. On the
             * `sm:` card there is no spare height to take, so it keeps its own.
             */}
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <Label htmlFor={FIELD}>{t("label")}</Label>
              <Textarea
                id={FIELD}
                name={FIELD}
                defaultValue={note}
                placeholder={t("placeholder")}
                maxLength={MAX_NOTE_LENGTH}
                // Tall enough to be worth opening for; the box scrolls past it.
                className="min-h-48 flex-1"
                // A refusal is not true any more the moment the text changes.
                onChange={() => setFailure(null)}
              />
            </div>

            {failure ? (
              <p className="text-destructive" role="alert">
                {failure.error}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <SubmitButton size="lg" className="w-full sm:w-auto">
              {t("save")}
            </SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
