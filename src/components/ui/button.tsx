import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // `relative` anchors the busy spinner, and is also what CountBadge asks of
  // whatever it sits in the corner of.
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-5 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:opacity-90",
        destructive:
          "bg-destructive text-destructive-foreground hover:opacity-90",
        outline:
          "border border-input bg-background hover:bg-secondary hover:text-secondary-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:opacity-80",
        ghost: "hover:bg-secondary hover:text-secondary-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      /*
       * Every size clears 40px and the two that carry real actions clear 44px,
       * the smallest target a thumb hits reliably. `sm` is the app's most-used
       * size — it is chrome, not a shrunken button, so it keeps a 15px label
       * rather than dropping to something you have to lean in for.
       */
      size: {
        default: "h-11 px-5 py-2 text-base",
        sm: "h-10 rounded-md px-4 text-sm",
        lg: "h-12 rounded-md px-6 text-lg",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

/**
 * `loading` is the app's only busy affordance —
 * docs/content/ui-patterns.md#a-busy-button-keeps-its-label. It cannot be
 * combined with `asChild`: `Slot` takes a single child and has nowhere to put
 * the spinner.
 */
function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        // Muted, but less than a plain disabled button: the spinner is inside
        // this fade and has to stay legible through it.
        loading && "disabled:opacity-75",
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <>
          {/*
           * The wrapper repeats the button's own `items-center gap-2`, so one
           * centred flex item measures what the loose children measured and the
           * width cannot move mid-action.
           *
           * It fades to a ghost rather than merely dimming, because the spinner
           * lands in the middle of the label: at anything more legible the two
           * collide and read as broken text instead of a busy control. An
           * icon-size button has one glyph and no room beside it, so there the
           * content goes away entirely.
           */}
          <span
            className={cn(
              "inline-flex items-center gap-2",
              size === "icon" ? "opacity-0" : "opacity-25",
            )}
          >
            {children}
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <LoaderCircleIcon className="animate-spin motion-reduce:animate-pulse" />
          </span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}

export { Button, buttonVariants };
