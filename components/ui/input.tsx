import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative flex items-center w-full">
        {icon && (
          <div className="pointer-events-none absolute left-3.5 flex items-center justify-center text-slate-500">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "h-10 w-full rounded-lg border border-slate-700/80 bg-slate-950/50 px-3.5 py-2 text-sm text-slate-100 placeholder:text-slate-500 transition-colors duration-150 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = "Input";
