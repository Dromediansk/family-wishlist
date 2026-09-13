"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { saveGroupNote } from "@/app/actions/notes";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupId } from "@/lib/ids";
import { MAX_NOTE_LENGTH } from "@/lib/notes";
import type { ActionFailure } from "@/lib/types";

/** Names both the form field and the label that points at it. */
const FIELD = "note-body";

/**
 * The whole of the notes page's interaction: a box, a button, and a refusal if
 * one comes back. Nothing marks a success — no form here does, and the author
 * leaves by the back link when they are done.
 *
 * The textarea is uncontrolled — nothing here needs to read what is being typed
 * before it is submitted, and leaving it uncontrolled is what keeps the text
 * the author is mid-sentence on from being replaced when the page revalidates
 * underneath them.
 *
 * A plain `<form action>`, so it still posts without JavaScript; `SubmitButton`
 * adds the spinner once hydrated.
 */
export function GroupNoteForm({
  groupId,
  initial,
}: {
  groupId: GroupId;
  initial: string;
}) {
  const t = useTranslations("notes");

  // Only the failed half is worth holding on to, as in `wish-form`.
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  async function submit(formData: FormData) {
    const result = await saveGroupNote(
      groupId,
      String(formData.get(FIELD) ?? ""),
    );
    setFailure(result.ok ? null : result);
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={FIELD}>{t("label")}</Label>
        <Textarea
          id={FIELD}
          name={FIELD}
          defaultValue={initial}
          placeholder={t("placeholder")}
          maxLength={MAX_NOTE_LENGTH}
          // Tall enough to hold a family's worth of plans without scrolling
          // inside a page that already scrolls.
          className="min-h-64"
          // A refusal is not true any more the moment the text changes again.
          onChange={() => setFailure(null)}
        />
      </div>

      {failure ? (
        <p className="text-destructive" role="alert">
          {failure.error}
        </p>
      ) : null}

      {/*
        `w-full sm:w-auto` is the house pairing, but it only sizes to content in
        a flex row — a dialog's `FOOTER` turns into one at `sm:`. This form is a
        column, whose default `stretch` would otherwise beat `w-auto` and leave
        a full-width button at every size.
      */}
      <SubmitButton size="lg" className="w-full sm:w-auto sm:self-start">
        {t("save")}
      </SubmitButton>
    </form>
  );
}
