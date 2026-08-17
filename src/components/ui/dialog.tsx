"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  ANIMATION_CARD_SM,
  ANIMATION_FADE,
  ANIMATION_SLIDE_UP,
  BODY,
  DESCRIPTION,
  FOOTER,
  FOOTER_SAFE_BOTTOM,
  HEADER,
  HEADER_SAFE_TOP,
  OVERLAY,
  PANEL_BASE,
  PANEL_CARD_SM,
  PANEL_FULLSCREEN,
  TITLE,
} from "@/components/ui/dialog-styles";

const Dialog = DialogPrimitive.Root;
const DialogTrigger = DialogPrimitive.Trigger;
const DialogClose = DialogPrimitive.Close;
const DialogPortal = DialogPrimitive.Portal;

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay className={cn(OVERLAY, className)} {...props} />
  );
}

/**
 * Full-screen on a phone, the centred card it always was from `sm:` up.
 *
 * Full-screen is expressed as *size* — a full-width, full-height box that is
 * already centred — rather than by re-anchoring it to all four edges. Zeroing
 * the inset would need an auto inset to undo it at the breakpoint, and that
 * only works while the auto one sits earlier in the class string:
 * tailwind-merge treats the inset shorthand as owning top and left, so moving
 * it later would delete them and drop the desktop card into the top-left
 * corner. One anchor for both sizes means the breakpoint changes nothing but
 * the dimensions.
 *
 * A direct child of this may be a `DialogHeader`, `DialogBody` or
 * `DialogFooter` — the padding lives on those, so anything else renders flush
 * against the panel edge. The one other thing allowed here is a wrapper that
 * passes the regions straight through, which is what `WishForm`'s
 * `flex min-h-0 flex-1 flex-col` form element is for.
 */
function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          PANEL_BASE,
          PANEL_FULLSCREEN,
          PANEL_CARD_SM,
          ANIMATION_FADE,
          // A screen-tall panel slides; a card zooms.
          ANIMATION_SLIDE_UP,
          ANIMATION_CARD_SM,
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close className="absolute top-[max(0.625rem,env(safe-area-inset-top))] right-2.5 inline-flex size-11 cursor-pointer items-center justify-center rounded-md opacity-70 transition-opacity hover:opacity-100 sm:top-2.5">
            <XIcon className="size-5" />
            <span className="sr-only">Zavrieť</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/**
 * Pinned to the top. Rules off against the scrolling body only on a phone,
 * where there is something to rule off against.
 *
 * `pr-14` keeps the title clear of the close button in the corner — a 44px
 * target inset by 10px. `AlertDialogHeader` has no such button and no such
 * padding.
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        HEADER,
        HEADER_SAFE_TOP,
        "border-b pr-14 sm:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

/** The scrolling middle — the only part that moves. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn(BODY, className)} {...props} />;
}

/** Pinned to the bottom, clear of the home indicator. */
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        FOOTER,
        FOOTER_SAFE_BOTTOM,
        "border-t sm:border-t-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn(TITLE, className)} {...props} />;
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn(DESCRIPTION, className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
