import * as React from "react";
import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-border bg-transparent px-2.5 py-1 text-sm transition-colors outline-none placeholder:text-muted focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-50 aria-invalid:border-danger aria-invalid:ring-3 aria-invalid:ring-danger/20",
        className
      )}
      {...props}
    />
  );
}

export { Input };
