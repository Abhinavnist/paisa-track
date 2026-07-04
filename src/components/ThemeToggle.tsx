"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "light" | "dark";

// Light/dark switch. Persists to localStorage and toggles the `.dark` class on <html>.
// The initial class is set pre-paint by a script in the root layout (no flash).
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setTheme(isDark ? "dark" : "light");
  }, []);

  function apply(next: Theme) {
    setTheme(next);
    try {
      localStorage.setItem("theme", next);
    } catch {}
    document.documentElement.classList.toggle("dark", next === "dark");
  }

  return (
    <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-700">
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => apply(t)}
          className={
            "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold capitalize transition " +
            (theme === t
              ? "bg-white text-slate-900 shadow dark:bg-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-300")
          }
        >
          {t === "light" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {t}
        </button>
      ))}
    </div>
  );
}
