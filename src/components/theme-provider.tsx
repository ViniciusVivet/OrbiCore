"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type ThemeKey = "dark" | "light" | "vibrant";

interface ThemeContextType {
  theme: ThemeKey;
  setTheme: (theme: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  setTheme: () => {},
});

const STORAGE_KEY = "orbicore_theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeKey | null;
    if (saved && ["dark", "light", "vibrant"].includes(saved)) {
      setThemeState(saved);
      applyTheme(saved);
    }
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: ThemeKey) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    applyTheme(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <div style={{ visibility: mounted ? "visible" : "hidden" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

function applyTheme(theme: ThemeKey) {
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  // Keep .dark class for dark variants in tailwind
  if (theme === "light") {
    html.classList.remove("dark");
  } else {
    html.classList.add("dark");
  }
}

export function useTheme() {
  return useContext(ThemeContext);
}
