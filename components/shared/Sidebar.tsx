"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenTool,
  Calendar,
  MessageSquare,
  Users,
  Search,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";

const navItems = [
  { name: "Overview", href: "/overview", icon: LayoutDashboard },
  { name: "Content Studio", href: "/content-studio", icon: PenTool },
  { name: "Calendar", href: "/calendar", icon: Calendar },
  { name: "Engagement", href: "/engagement", icon: MessageSquare },
  { name: "Networking", href: "/networking", icon: Users },
  { name: "Lead Generation", href: "/lead-gen", icon: Search },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderNavItems = (mobile = false) => navItems.map((item) => {
    const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
    return (
      <Link
        key={item.name}
        href={item.href}
        aria-current={isActive ? "page" : undefined}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-gradient-to-r from-blue-500/20 to-blue-500/[0.06] text-white ring-1 ring-inset ring-blue-400/20"
            : "text-slate-400 hover:bg-white/[0.045] hover:text-slate-100"
        )}
      >
        <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-blue-300" : "text-slate-500")} />
        <span>{item.name}</span>
      </Link>
    );
  });

  return (
    <>
      <aside className="hidden h-full w-[252px] shrink-0 flex-col border-r border-white/[0.07] bg-[#0a1423] text-slate-100 md:flex">
        <div className="flex h-[68px] items-center border-b border-white/[0.07] px-5">
          <Link href="/overview" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-9 w-9 rounded-xl ring-1 ring-white/10" />
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-[0.08em] text-white">LINKEDO</span>
              <span className="mt-1 text-[9px] font-medium uppercase tracking-[0.2em] text-slate-500">AI Studio</span>
            </span>
          </Link>
        </div>

        <div className="px-5 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">
          Workspace
        </div>
        <nav aria-label="Workspace navigation" className="flex-1 space-y-1 px-3 py-2">{renderNavItems()}</nav>

        <div className="flex items-center justify-between border-t border-white/[0.07] p-4">
          <div className="text-xs text-slate-500">v0.1.0</div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      <div className="relative z-30 border-b border-white/[0.07] bg-[#0a1423] text-white md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/overview" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="" className="h-8 w-8 rounded-lg ring-1 ring-white/10" />
            <span className="text-sm font-semibold tracking-[0.08em]">LINKEDO</span>
          </Link>
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isMobileMenuOpen && (
          <nav aria-label="Workspace navigation" className="absolute inset-x-0 top-full space-y-1 border-b border-white/[0.08] bg-[#0a1423] px-3 pb-3 pt-2 shadow-2xl shadow-black/30">
            {renderNavItems(true)}
            <form action={signOut} className="border-t border-white/[0.08] pt-2">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
              >
                <LogOut className="h-[18px] w-[18px]" /> Sign Out
              </button>
            </form>
          </nav>
        )}
      </div>
    </>
  );
}
