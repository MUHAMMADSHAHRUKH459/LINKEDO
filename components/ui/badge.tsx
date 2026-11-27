import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "success" | "warning" | "info" | "purple";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-blue-400/20 bg-blue-500/15 text-blue-200",
    secondary: "border-slate-600/70 bg-slate-800/80 text-slate-300",
    outline: "border-slate-600/70 bg-slate-900/50 text-slate-300",
    success: "border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-400/20 bg-amber-500/10 text-amber-200",
    info: "border-sky-400/20 bg-sky-500/10 text-sky-200",
    purple: "border-violet-400/20 bg-violet-500/10 text-violet-200",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
