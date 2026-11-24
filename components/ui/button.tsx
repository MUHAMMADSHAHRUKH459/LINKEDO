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
      "inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer";

    const variants = {
      default:
        "bg-[#0a66c2] hover:bg-[#084f96] text-white shadow-sm shadow-blue-900/10",
      glow:
        "bg-[#0a66c2] hover:bg-[#084f96] text-white shadow-sm shadow-blue-900/10",
      outline:
        "border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700",
      secondary:
        "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200",
      ghost:
        "hover:bg-slate-100 text-slate-600 hover:text-slate-900",
      danger:
        "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200",
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
