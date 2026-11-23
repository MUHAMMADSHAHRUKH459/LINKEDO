import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { hoverEffect?: boolean }
>(({ className, hoverEffect = false, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-xl border border-slate-800/80 bg-slate-900/60 backdrop-blur-md p-5 shadow-lg shadow-black/40 text-slate-100",
      hoverEffect && "transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/80 hover:shadow-blue-950/10",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

export const CardHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 mb-4", className)} {...props} />
);

export const CardTitle = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn("font-semibold text-lg tracking-tight text-slate-100", className)} {...props} />
);

export const CardDescription = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-xs text-slate-400 font-normal leading-relaxed", className)} {...props} />
);

export const CardContent = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("", className)} {...props} />
);

export const CardFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between", className)} {...props} />
);
