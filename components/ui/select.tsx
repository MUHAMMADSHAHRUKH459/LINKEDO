"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  onValueChange?: (value: string) => void;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, onValueChange, onChange, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={cn(
            "flex h-10 w-full appearance-none items-center justify-between rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          onChange={(e) => {
            if (onValueChange) onValueChange(e.target.value);
            if (onChange) onChange(e);
          }}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none text-slate-400" />
      </div>
    );
  }
);
Select.displayName = "Select";

const SelectTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => children;
const SelectContent = ({ children }: { children: React.ReactNode }) => children;
const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => (
  <option value={value} className="bg-slate-900 text-slate-100">
    {children}
  </option>
);
const SelectValue = ({ placeholder }: { placeholder?: string }) => null;

export { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
