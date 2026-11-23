import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "w-full rounded-lg border border-slate-800 bg-slate-950/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 resize-y min-h-[100px]",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";
