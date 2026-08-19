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
 * Full-screen on a phone, centred card from `sm:` up — expressed as *size*, not
 * by re-anchoring, so the breakpoint changes nothing but the dimensions.
 *
 * A direct child must be a `DialogHeader`, `DialogBody` or `DialogFooter`, or a
 * wrapper that passes those straight through (`WishForm`). The padding lives on
 * the regions. docs/content/ui-patterns.md#three-things-that-will-bite
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
 * Pinned to the top; rules off against the scrolling body only on a phone.
 * `pr-14` clears the close button — a 44px target inset by 10px.
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
