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
    const isActive = pathname.startsWith(item.href);
    return (
      <Link
        key={item.name}
        href={item.href}
        onClick={() => mobile && setIsMobileMenuOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-white/10 text-white"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        )}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        {item.name}
      </Link>
    );
  });

  return (
    <>
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-[#263653] bg-[#101c32] text-slate-100 md:flex">
        <div className="flex h-16 items-center border-b border-[#263653] px-6">
          <Link href="/overview" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="LINKEDO" className="h-8 w-8 rounded-md" />
            <span className="text-lg font-semibold tracking-tight text-white">LINKEDO</span>
          </Link>
        </div>

        <div className="px-5 pb-2 pt-7 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
          Workspace
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">{renderNavItems()}</nav>

        <div className="flex items-center justify-between border-t border-[#263653] p-4">
          <div className="text-xs text-slate-500">v0.1.0</div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex cursor-pointer items-center gap-2 text-xs text-slate-400 transition-colors hover:text-white"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </button>
          </form>
        </div>
      </aside>

      <div className="relative z-30 border-b border-[#263653] bg-[#101c32] text-white md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/overview" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="LINKEDO" className="h-7 w-7 rounded-md" />
            <span className="font-semibold tracking-tight">LINKEDO</span>
          </Link>
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {isMobileMenuOpen && (
          <nav className="absolute inset-x-0 top-full space-y-1 border-b border-[#263653] bg-[#101c32] px-3 pb-3 pt-2 shadow-xl">
            {renderNavItems(true)}
            <form action={signOut} className="border-t border-[#263653] pt-2">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
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
