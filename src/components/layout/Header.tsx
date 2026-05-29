"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, User, Bell } from "lucide-react";
import { useEffect, useState } from "react";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="flex items-center justify-between h-14 px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <h1 className="text-base font-semibold text-gray-800 dark:text-gray-100">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        {/* Dark mode toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-2 rounded-md text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Toggle dark mode"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        {/* Notifications placeholder */}
        <button className="p-2 rounded-md text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <Bell size={18} />
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200 dark:border-gray-700">
          <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <span className="text-sm text-gray-700 dark:text-gray-300 hidden sm:block">
            richard
          </span>
        </div>
      </div>
    </header>
  );
}
