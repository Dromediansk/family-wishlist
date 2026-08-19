"use client";

import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * A wish's thumbnail, and the full picture it opens.
 *
 * A dialog rather than a new tab: the installed app runs `display: "standalone"`,
 * where a `target="_blank"` photo lands in a separate browser and the way back is
 * a task switch rather than a button — and even in a desktop tab the way back is
 * whatever chrome happens to be on screen. A dialog closes with the X, the
 * button, Escape or a click outside, and leaves the list exactly where it was.
 *
 * docs/content/ui-patterns.md#looking-at-a-photo
 */
export function WishPhotoDialog({
  src,
  title,
}: {
  src: string;
  title: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        className="shrink-0 cursor-pointer rounded-lg"
        aria-label={`Zobraziť fotku: ${title}`}
      >
        {/*
         * A plain <img>, as in the photo field: the optimizer would fetch
         * /wish-photo server-side, without the visitor's session, and be
         * answered with a 404, so there is nothing for it to do.
         */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          loading="lazy"
          className="size-16 rounded-lg border object-cover sm:size-24"
        />
      </DialogTrigger>
      {/* `sm:`-qualified, or the width leaks down and un-fullscreens the phone. */}
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="break-words">{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={`Fotka: ${title}`}
            /*
             * Full width and as tall as it likes, scrolling in the body — the
             * reason a thumbnail opens at all is to read a screenshot of a
             * shop's page, and fitting one to the panel's height shrinks the
             * text back to unreadable.
             */
            className="w-full rounded-md"
          />
        </DialogBody>
        {/*
         * The X is top-right, which is the far corner from a thumb. This is the
         * same exit within reach of one.
         */}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Zavrieť</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
