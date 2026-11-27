"use client";

import { ChevronRight, Layers } from "lucide-react";
import { usePathname } from "next/navigation";

const pageNames: Record<string, string> = {
  analytics: "Analytics",
  calendar: "Calendar",
  "content-studio": "Content Studio",
  engagement: "Engagement Assistant",
  "lead-gen": "Lead Generation",
  networking: "Networking Assistant",
  overview: "Overview",
  settings: "Settings",
};

export function Topbar() {
  const pathname = usePathname();
  const pageKey = pathname.split("/").filter(Boolean).at(-1) ?? "overview";
  const pageName = pageNames[pageKey] ?? "Workspace";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#0a1423]/95 px-4 sm:h-[68px] sm:px-6 lg:px-8">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <span className="hidden text-xs font-medium text-slate-500 sm:inline">Workspace</span>
        <ChevronRight className="hidden h-3.5 w-3.5 text-slate-600 sm:block" />
        <span className="truncate font-medium text-slate-200">{pageName}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-400">
        <Layers className="h-3.5 w-3.5 text-slate-500" />
        <span className="hidden sm:inline">Personal workspace</span>
        <span className="sm:hidden">Personal</span>
      </div>
    </header>
  );
}
