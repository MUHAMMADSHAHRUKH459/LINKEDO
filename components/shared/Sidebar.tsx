"use client";

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

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950/50 hidden md:flex flex-col h-full">
      <div className="h-16 flex items-center px-6 border-b border-slate-800">
        <Link href="/overview" className="flex items-center gap-2">
          <img src="/logo.png" alt="LINKEDO" className="h-8 w-8" />
          <span className="font-bold text-lg text-blue-500 tracking-tight">LINKEDO</span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-blue-600/10 text-blue-400 border border-blue-500/20"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <div className="text-xs text-slate-500">v0.1.0</div>
        <form action={signOut}>
          <button
            type="submit"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </button>
        </form>
      </div>
    </aside>
  );
}
