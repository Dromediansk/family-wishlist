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
import type { GroupId } from "@/lib/ids";
import type { ActionFailure, ActionResult, GroupRef } from "@/lib/types";

export type WishFormValues = {
  title: string;
  description: string;
  url: string;
  groupIds: GroupId[];
  photo: WishPhotoChoice;
};

type Props = {
  initial?: WishFormValues;
  /** The wish's current photo, when editing one that already has it. */
  initialPhotoUrl?: string | null;
  /** Every group the owner belongs to. The picker is hidden when there's only one. */
  groups: readonly GroupRef[];
  /**
   * What a *new* wish starts tagged with, and what the form resets to once one
   * is added. Optional because an edit has no use for it — `initial` carries
   * the wish's own tags — and the type is what says so.
   */
  defaultGroupIds?: GroupId[];
  submitLabel: string;
  onSubmit: (values: WishFormValues) => Promise<ActionResult>;
  onDone: () => void;
};

const EMPTY_TEXT: Pick<WishFormValues, "title" | "description" | "url" | "photo"> = {
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
  groups,
  defaultGroupIds = [],
  submitLabel,
  onSubmit,
  onDone,
}: Props) {
  const blank: WishFormValues = { ...EMPTY_TEXT, groupIds: defaultGroupIds };
  const [values, setValues] = useState<WishFormValues>(initial ?? blank);
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
      if (!initial) setValues(blank);
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

        {groups.length > 1 ? (
          <div className="flex flex-col gap-2">
            <Label>Viditeľné v skupinách</Label>
            {/*
             * Two columns at every width. Half a full-screen phone dialog is
             * about eleven characters at 17px, so a long name wraps rather than
             * clipping — a picker you cannot read is worse than a tall one —
             * and `items-start` keeps the box on its first line when it does.
             */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {groups.map((group) => (
                <label
                  key={group.id}
                  className="flex items-start gap-2 text-base"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
                    checked={values.groupIds.includes(group.id)}
                    onChange={(event) =>
                      update(
                        "groupIds",
                        event.target.checked
                          ? [...values.groupIds, group.id]
                          : values.groupIds.filter((id) => id !== group.id),
                      )
                    }
                  />
                  <span className="min-w-0 break-words">{group.name}</span>
                </label>
              ))}
            </div>
          </div>
        ) : null}

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
            disabled={values.title.trim() === "" || values.groupIds.length === 0}
          >
            {submitLabel}
          </Button>
        )}
      </DialogFooter>
    </form>
  );
}
