"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      // `leading-tight`, not `leading-none`: a line box the exact height of the
      // type clips the caron off a capital Č or Ľ, which Slovak labels have.
      className={cn("text-base leading-tight font-medium select-none", className)}
      {...props}
    />
  );
}

export { Label };
