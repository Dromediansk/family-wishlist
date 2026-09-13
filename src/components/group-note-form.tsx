"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { saveGroupNote } from "@/app/actions/notes";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { GroupId } from "@/lib/ids";
import { MAX_NOTE_LENGTH } from "@/lib/notes";
import type { ActionResult } from "@/lib/types";

/** Names both the form field and the label that points at it. */
const FIELD = "note-body";

/**
 * The whole of the notes page's interaction: a box, a button, and a tick when
 * it lands. The author stays put and leaves by the back link, like every other
 * page here — the tick reports what happened rather than announcing a move.
 *
 * The tick is not on a timer. It says the box as it stands is saved, which is
 * true until the text changes again, and that is exactly when `onChange` drops
 * it. A countdown would only make a standing fact look like a passing one.
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

  // One state, because the action already returns one: a tick and a refusal
  // cannot both be true, and `null` is the note as the author left it.
  const [result, setResult] = useState<ActionResult | null>(null);

  async function submit(formData: FormData) {
    setResult(await saveGroupNote(groupId, String(formData.get(FIELD) ?? "")));
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
          // Neither word is true any more the moment the text changes again.
          onChange={() => setResult(null)}
        />
      </div>

      {result && !result.ok ? (
        <p className="text-destructive" role="alert">
          {result.error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <SubmitButton size="lg" className="w-full sm:w-auto">
          {t("save")}
        </SubmitButton>
        {result?.ok ? (
          /* The word is still here for a screen reader; the eye gets the tick. */
          <p className="text-primary" role="status">
            <CheckIcon className="size-5" aria-hidden />
            <span className="sr-only">{t("saved")}</span>
          </p>
        ) : null}
      </div>
    </form>
  );
}
