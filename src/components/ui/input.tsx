import * as React from "react";

import { INPUT } from "@/components/ui/field-styles";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(INPUT, className)}
      {...props}
    />
  );
}

export { Input };
