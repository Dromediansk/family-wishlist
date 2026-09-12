"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { saveGroupNote } from "@/app/actions/notes";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupId } from "@/lib/ids";
import { NOTE_MAX_LENGTH } from "@/lib/notes";

/** Names both the form field and the label that points at it. */
const FIELD = "note-body";

/**
 * The whole of the notes page's interaction: a box, a button, and a word when
 * it lands.
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
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(formData: FormData) {
    const result = await saveGroupNote(groupId, String(formData.get(FIELD) ?? ""));
    if (!result.ok) {
      setError(result.error);
      setSaved(false);
      return;
    }
    setError(null);
    setSaved(true);
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
          maxLength={NOTE_MAX_LENGTH}
          // Tall enough to hold a family's worth of plans without scrolling
          // inside a page that already scrolls.
          className="min-h-64"
          // Neither word is true any more the moment the text changes again.
          onChange={() => {
            setSaved(false);
            setError(null);
          }}
        />
      </div>

      {error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton size="lg" className="w-full sm:w-auto">
          {t("save")}
        </SubmitButton>
        {saved ? (
          <p className="text-muted-foreground" role="status">
            {t("saved")}
          </p>
        ) : null}
      </div>
    </form>
  );
}
