"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DialogBody, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  WishPhotoField,
  type WishPhotoChoice,
} from "@/components/wish-photo-field";
import type { ActionFailure, ActionResult } from "@/lib/types";

export type WishFormValues = {
  title: string;
  description: string;
  url: string;
  photo: WishPhotoChoice;
};

type Props = {
  initial?: WishFormValues;
  /** The wish's current photo, when editing one that already has it. */
  initialPhotoUrl?: string | null;
  submitLabel: string;
  onSubmit: (values: WishFormValues) => Promise<ActionResult>;
  onDone: () => void;
};

const EMPTY: WishFormValues = {
  title: "",
  description: "",
  url: "",
  // On a new wish there is nothing to change, which is the same as no photo.
  photo: { kind: "unchanged" },
};

/** Full width on a phone so the thumb has the whole edge to aim at. */
const ACTION_BUTTON = "w-full sm:w-auto";

/** Shared by the add and edit dialogs — title required, the rest optional. */
export function WishForm({
  initial,
  initialPhotoUrl = null,
  submitLabel,
  onSubmit,
  onDone,
}: Props) {
  const [values, setValues] = useState<WishFormValues>(initial ?? EMPTY);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, startTransition] = useTransition();

  /**
   * Retrying cannot help, so there is nothing left to submit. A validation
   * message leaves this false.
   * docs/content/ui-patterns.md#a-refusal-ends-the-dialog
   */
  const refused = failure?.final === true;

  function update<Field extends keyof WishFormValues>(
    field: Field,
    value: WishFormValues[Field],
  ) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFailure(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        setFailure(result);
        return;
      }
      if (!initial) setValues(EMPTY);
      onDone();
    });
  }

  /*
   * The form *is* the dialog's body and footer, not a block inside them, so the
   * fields scroll while the button stays pinned to the bottom edge. `min-h-0` is
   * what lets it shrink to the panel rather than to its own content.
   */
  return (
    <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
      <DialogBody className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="wish-title">Názov</Label>
          <Input
            id="wish-title"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="napr. Vlnené ponožky, veľkosť 42"
            maxLength={120}
            autoFocus
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wish-description">
            Popis <span className="text-muted-foreground">(nepovinné)</span>
          </Label>
          <Textarea
            id="wish-description"
            value={values.description}
            onChange={(event) => update("description", event.target.value)}
            placeholder="Farba, veľkosť alebo čokoľvek iné, čo je dobré vedieť."
            maxLength={1000}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wish-url">
            Odkaz <span className="text-muted-foreground">(nepovinné)</span>
          </Label>
          <Input
            id="wish-url"
            type="url"
            inputMode="url"
            value={values.url}
            onChange={(event) => update("url", event.target.value)}
            placeholder="https://…"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="wish-photo">
            Fotka <span className="text-muted-foreground">(nepovinné)</span>
          </Label>
          <WishPhotoField
            id="wish-photo"
            value={values.photo}
            existingUrl={initialPhotoUrl}
            disabled={pending}
            onChange={(photo) => update("photo", photo)}
          />
        </div>

        {failure ? (
          <p className="text-destructive" role="alert">
            {failure.error}
          </p>
        ) : null}
      </DialogBody>

      <DialogFooter>
        {refused ? (
          /*
           * The way out replaces the way forward, rather than sitting next to
           * it disabled.
           */
          <Button
            type="button"
            size="lg"
            variant="outline"
            className={ACTION_BUTTON}
            onClick={onDone}
          >
            Zavrieť
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            className={ACTION_BUTTON}
            loading={pending}
            disabled={values.title.trim() === ""}
          >
            {submitLabel}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}
