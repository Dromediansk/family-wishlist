"use client";

import { useState, useTransition } from "react";
import { SparklesIcon } from "lucide-react";

import { addMember } from "@/app/actions/members";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Shown when there are no family members yet. Whoever fills this in becomes the
 * admin and is signed in as themselves.
 */
export function FirstRun() {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addMember({ name });
      if (!result.ok) setError(result.error);
      else setName("");
    });
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SparklesIcon className="text-primary size-5" />
          Nastav svoju rodinu
        </CardTitle>
        <CardDescription>
          Začni vlastným menom. Budeš správca, takže potom môžeš pridať všetkých
          ostatných.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="first-member-name">Tvoje meno</Label>
          <Input
            id="first-member-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="napr. Miroslav"
            maxLength={50}
            autoFocus
            required
          />
        </div>
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || name.trim() === ""}>
          {pending ? "Vytváram…" : "Vytvoriť rodinu"}
        </Button>
      </form>
    </Card>
  );
}
