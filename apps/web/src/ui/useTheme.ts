import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const THEME_KEY = "moltpostor.theme";

const LIGHT = {
  "--color-bg": "#fff",
  "--color-bg-surface": "#fff",
  "--color-bg-hover": "#e8e8e8",
  "--color-bg-accent": "#e8e8e8",
  "--color-bg-accent-alt": "#d8e8f8",
  "--color-bg-code": "#f5f5f5",
  "--color-text": "#000",
  "--color-border": "#ddd",
  "--color-border-strong": "#ccc",
  "--color-shadow": "rgba(0,0,0,0.15)",
};

const DARK: Record<string, string> = {
  "--color-bg": "#1a1a1a",
  "--color-bg-surface": "#252525",
  "--color-bg-hover": "#3a3a3a",
  "--color-bg-accent": "#3a3a3a",
  "--color-bg-accent-alt": "#2a3a4a",
  "--color-bg-code": "#2a2a2a",
  "--color-text": "#e0e0e0",
  "--color-border": "#444",
  "--color-border-strong": "#555",
  "--color-shadow": "rgba(0,0,0,0.4)",
};

function applyTheme(theme: Theme) {
  const vars = theme === "dark" ? DARK : LIGHT;
  const root = document.documentElement;
  root.style.colorScheme = theme;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  document.body.style.background = vars["--color-bg"];
  document.body.style.color = vars["--color-text"];
}

function loadTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY);
    if (v === "dark" || v === "light") return v;
  } catch { /* ignore */ }
  return "light";
}

export function useTheme(): [Theme, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(loadTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch { /* ignore */ }
  }, [theme]);

  useEffect(() => {
    applyTheme(theme);
  }, []);

  return [theme, setThemeState];
}
