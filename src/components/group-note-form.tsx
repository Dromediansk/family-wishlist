"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckIcon } from "lucide-react";
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
 * How long the check stays before the group page replaces it. Long enough to
 * be seen and read as "that landed", short enough that nobody waits on it.
 */
const SAVED_DWELL_MS = 800;

/**
 * The whole of the notes page's interaction: a box, a button, a tick when it
 * lands, and the way back to the group a moment later.
 *
 * Typing during that moment cancels the departure — the effect's cleanup runs
 * when `saved` goes false again, so second thoughts keep the page.
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
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  /*
   * The way back, once the check has been seen. Deliberately not awaited inside
   * the action: `SubmitButton` watches `useFormStatus`, so holding the action
   * open would spin the button through the pause and show a spinner and a check
   * at once. The cleanup matters — leaving under one's own steam during the
   * pause must not drag the group page along a moment later.
   *
   * `saveGroupNote` has already revalidated, so the page this lands on shows
   * the note's mark without asking for anything further.
   */
  useEffect(() => {
    if (!saved) return;
    const timer = setTimeout(
      () => router.push(`/g/${groupId}`),
      SAVED_DWELL_MS,
    );
    return () => clearTimeout(timer);
  }, [saved, groupId, router]);

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
