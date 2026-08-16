import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        accent: "border-transparent bg-accent text-accent-foreground",
        outline: "text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * The small number in the corner of a button or avatar.
 *
 * The geometry is fiddly — the offsets, the 10px type, the ring that punches it
 * out of whatever it sits on — so it lives here rather than being retyped at
 * each call site. The parent must be positioned (`relative`), and the count
 * itself belongs in that parent's `aria-label`: this is `aria-hidden`, because a
 * bare number read out on its own says nothing.
 */
function CountBadge({ className, ...props }: React.ComponentProps<typeof Badge>) {
  return (
    <Badge
      aria-hidden="true"
      className={cn(
        "ring-background absolute -top-1 -right-1 min-w-4 justify-center px-1 py-0 text-[0.625rem] leading-4 ring-2",
        className,
      )}
      {...props}
    />
  );
}

export { Badge, CountBadge, badgeVariants };
