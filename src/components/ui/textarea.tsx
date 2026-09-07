import * as React from "react";

import { TEXTAREA } from "@/components/ui/field-styles";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(TEXTAREA, className)}
      {...props}
    />
  );
}

export { Textarea };
