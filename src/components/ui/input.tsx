import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // `text-base` is 17px. Anything under 16px makes iOS Safari zoom the
        // viewport the moment the field takes focus, and never zoom back out.
        "border-input bg-background placeholder:text-muted-foreground flex h-11 w-full rounded-md border px-3.5 py-2 text-base shadow-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
