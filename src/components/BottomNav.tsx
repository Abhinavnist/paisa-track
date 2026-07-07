"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, ListOrdered, Users, NotebookPen, MoreHorizontal, LineChart, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/expenses", label: "History", icon: ListOrdered },
  { href: "/splits", label: "Splits", icon: Users },
  { href: "/notes", label: "Notes", icon: NotebookPen },
];

// Routes tucked behind the "More" menu to keep the bar at five slots.
const MORE = [
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const moreActive = MORE.some((m) => isActive(m.href));
  const linkCls = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium",
      active ? "text-emerald-600" : "text-slate-400",
    );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-700 dark:bg-slate-900/95">
      <div className="relative mx-auto flex max-w-md items-stretch justify-around">
        {ITEMS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={linkCls(isActive(href))}>
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}

        <div className="flex flex-1" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={cn(linkCls(moreActive), "w-full")}
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <MoreHorizontal className="h-5 w-5" />
            More
          </button>

          {open && (
            <div className="absolute bottom-full right-2 mb-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
              {MORE.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium",
                    isActive(href)
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700",
                  )}
                >
                  <Icon className="h-4 w-4" /> {label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
