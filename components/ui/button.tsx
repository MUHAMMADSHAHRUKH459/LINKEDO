import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "secondary" | "danger" | "glow";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg cursor-pointer";

    const variants = {
      default:
        "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/20 active:scale-[0.98]",
      glow:
        "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 border border-blue-400/30 active:scale-[0.98]",
      outline:
        "border border-slate-800 bg-slate-900/50 hover:bg-slate-800/80 hover:border-slate-700 text-slate-200",
      secondary:
        "bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/50",
      ghost:
        "hover:bg-slate-800/60 text-slate-300 hover:text-white",
      danger:
        "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30",
    };

    const sizes = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-10 px-4 text-sm gap-2",
      lg: "h-11 px-6 text-base gap-2.5",
      icon: "h-9 w-9 p-0 flex items-center justify-center",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
