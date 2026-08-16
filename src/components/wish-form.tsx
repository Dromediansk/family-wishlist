"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ActionResult } from "@/lib/types";

export type WishFormValues = {
  title: string;
  description: string;
  url: string;
};

type Props = {
  initial?: WishFormValues;
  submitLabel: string;
  pendingLabel: string;
  onSubmit: (values: WishFormValues) => Promise<ActionResult>;
  onDone: () => void;
};

const EMPTY: WishFormValues = { title: "", description: "", url: "" };

/** Shared by the add and edit dialogs — title required, the rest optional. */
export function WishForm({
  initial,
  submitLabel,
  pendingLabel,
  onSubmit,
  onDone,
}: Props) {
  const [values, setValues] = useState<WishFormValues>(initial ?? EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(field: keyof WishFormValues, value: string) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await onSubmit(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (!initial) setValues(EMPTY);
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

      {error ? (
        <p className="text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {/* Full width on a phone, so the thumb has the whole edge to aim at. */}
      <Button
        type="submit"
        size="lg"
        className="w-full sm:ml-auto sm:w-auto"
        disabled={pending || values.title.trim() === ""}
      >
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
