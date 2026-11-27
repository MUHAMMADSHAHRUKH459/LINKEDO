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
      "inline-flex cursor-pointer items-center justify-center rounded-lg font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1423] disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      default:
        "bg-blue-600 text-white shadow-sm shadow-blue-950/30 hover:bg-blue-500 active:bg-blue-700",
      glow:
        "bg-blue-600 text-white shadow-sm shadow-blue-950/30 hover:bg-blue-500 active:bg-blue-700",
      outline:
        "border border-slate-700/80 bg-slate-900/70 text-slate-200 hover:border-slate-600 hover:bg-slate-800",
      secondary:
        "border border-slate-700/70 bg-slate-800/80 text-slate-200 hover:border-slate-600 hover:bg-slate-700",
      ghost:
        "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100",
      danger:
        "border border-red-400/20 bg-red-500/10 text-red-300 hover:bg-red-500/20",
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
