"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  KeyRound,
  Server,
  ShieldAlert,
  Zap,
  Cloud,
  Info,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/access", icon: KeyRound, label: "EC2 Access" },
  { href: "/resources", icon: Server, label: "Resources" },
  { href: "/security", icon: ShieldAlert, label: "Security" },
  { href: "/automation", icon: Zap, label: "Automation" },
  { href: "/about", icon: Info, label: "About" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "relative flex flex-col bg-gray-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-700">
        <Cloud className="shrink-0 text-orange-400" size={22} />
        {!collapsed && (
          <span className="font-semibold text-sm leading-tight">
            AWS Secure<br />Admin Hub
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                active
                  ? "bg-orange-500/20 text-orange-400 border-r-2 border-orange-400"
                  : "text-gray-400 hover:bg-gray-800 hover:text-white"
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center p-3 border-t border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
