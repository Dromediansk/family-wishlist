"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { createGroup } from "@/app/actions/groups";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionFailure } from "@/lib/types";

/** The one field, named for both the form data and the label. */
const FIELD = "group-name";

/**
 * Starts a group and makes the caller its admin. The name is all the client
 * sends; the owner comes from the session.
 */
export function CreateGroupDialog() {
  const t = useTranslations("groups.create");
  const common = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<ActionFailure | null>(null);

  /**
   * Retrying cannot help — the creation cap is the only refusal that says so.
   * docs/decisions/ui-patterns.md#a-refusal-ends-the-dialog
   */
  const refused = failure?.final === true;

  async function submit(formData: FormData) {
    const result = await createGroup(String(formData.get(FIELD) ?? ""));
    if (!result.ok) {
      setFailure(result);
      return;
    }
    setOpen(false);
    setFailure(null);
    // Straight into the group just made. `/` is the fallback, and it picks the
    // first group by join date.
    router.push(result.groupId ? `/g/${result.groupId}` : "/");
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
        <Button className="w-full sm:w-auto">
          <PlusIcon />
          {t("action")}
        </Button>
      </DialogTrigger>
      {/* `sm:`-qualified, or the width leaks down and un-fullscreens the phone. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("action")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {/*
         * The form *is* the body and footer, not a block inside them, so the
         * field scrolls while the button stays pinned to the bottom edge.
         */}
        <form action={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={FIELD}>{t("nameLabel")}</Label>
              <Input
                id={FIELD}
                name={FIELD}
                defaultValue=""
                placeholder={t("namePlaceholder")}
                maxLength={60}
                autoFocus
                required
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
              // The way out replaces the way forward, rather than sitting next
              // to it disabled.
              <DialogClose asChild>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  {common("close")}
                </Button>
              </DialogClose>
            ) : (
              <SubmitButton size="lg" className="w-full sm:w-auto">
                {t("action")}
              </SubmitButton>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
