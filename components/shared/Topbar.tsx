"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Topbar() {
  return (
    <header className="h-16 border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            className="h-9 w-64 rounded-lg border border-slate-800 bg-slate-900/50 pl-9 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-slate-400">
          <Bell className="h-5 w-5" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-sm font-semibold text-blue-400">
          JD
        </div>
      </div>
    </header>
  );
}
