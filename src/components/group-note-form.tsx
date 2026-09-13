"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { saveGroupNote } from "@/app/actions/notes";
import { SubmitButton } from "@/components/submit-button";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupId } from "@/lib/ids";
import { MAX_NOTE_LENGTH } from "@/lib/notes";
import type { ActionFailure } from "@/lib/types";

/** Names both the form field and the label that points at it. */
const FIELD = "note-body";

/**
 * The whole of the notes dialog's interaction: a box, a button, and a refusal
 * if one comes back. Success needs no marker of its own — it closes the dialog.
 *
 * The textarea is uncontrolled — nothing here needs to read what is being typed
 * before it is submitted, and leaving it uncontrolled is what keeps the text
 * the author is mid-sentence on from being replaced when the page underneath
 * revalidates.
 *
 * A plain `<form action>`, as in `CreateGroupDialog`; `SubmitButton` adds the
 * spinner.
 */
export function GroupNoteForm({
  groupId,
  initial,
  onDone,
}: {
  groupId: GroupId;
  initial: string;
  onDone: () => void;
}) {
  const t = useTranslations("notes");

  // Only the failed half is worth holding on to, as in `wish-form`.
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  async function submit(formData: FormData) {
    const result = await saveGroupNote(
      groupId,
      String(formData.get(FIELD) ?? ""),
    );
    if (result.ok) {
      onDone();
      return;
    }
    setFailure(result);
  }

  /*
   * The form *is* the dialog's body and footer, not a block inside them, so the
   * box takes the room going spare while the button stays pinned to the bottom
   * edge. `min-h-0` is what lets it shrink to the panel rather than to its own
   * content. docs/decisions/ui-patterns.md#three-things-that-will-bite
   */
  return (
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
            defaultValue={initial}
            placeholder={t("placeholder")}
            maxLength={MAX_NOTE_LENGTH}
            // Tall enough to be worth opening for; the box scrolls past it.
            className="min-h-48 flex-1"
            // A refusal is not true any more the moment the text changes again.
            onChange={() => setFailure(null)}
          />
        </div>

        {failure ? (
          <p className="text-destructive shrink-0" role="alert">
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
  );
}
