"use client";

import { useState } from "react";
import { NotebookPenIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { GroupNoteForm } from "@/components/group-note-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { GroupId } from "@/lib/ids";

/**
 * One member's private notebook for one group, opened from the group's heading.
 *
 * The note arrives as a prop rather than being read here: the group page needs
 * it anyway to decide whether to mark the trigger, so one read serves both. The
 * panel unmounts when it closes, which is what makes each opening start from
 * whatever the last render of that page brought.
 */
export function GroupNoteDialog({
  groupId,
  note,
}: {
  groupId: GroupId;
  note: string;
}) {
  const t = useTranslations("notes");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="shrink-0">
          <NotebookPenIcon />
          {/*
           * Icon alone on a narrow screen, like the header's own entries — but
           * the label stays in the accessible name rather than moving to an
           * `aria-label`, which would swallow the mark below.
           */}
          <span className="sr-only sm:not-sr-only">{t("action")}</span>
          {/*
           * A mark, not a count: the button says whether there is anything to
           * come back to, and the note itself says how much.
           */}
          {note !== "" ? (
            <>
              <span className="bg-primary size-1.5 rounded-full" aria-hidden />
              <span className="sr-only">{t("filled")}</span>
            </>
          ) : null}
        </Button>
      </DialogTrigger>
      {/* `sm:`-qualified, or the width leaks down and un-fullscreens the phone. */}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          {/* Nobody writes an honest gift plan into a box they don't trust. */}
          <DialogDescription>{t("intro")}</DialogDescription>
        </DialogHeader>
        <GroupNoteForm
          groupId={groupId}
          initial={note}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
