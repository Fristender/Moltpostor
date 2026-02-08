import { useState, useEffect, useCallback } from "react";

export type AppSettings = {
  theme: "light" | "dark";
  watchHistoryLimit: number;
};

const STORAGE_KEY = "moltpostor.settings.v1";

const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  watchHistoryLimit: 10000,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch { /* ignore */ }
  
  // Migrate from old theme storage
  try {
    const oldTheme = localStorage.getItem("moltpostor.theme");
    if (oldTheme === "light" || oldTheme === "dark") {
      const settings: AppSettings = { ...DEFAULT_SETTINGS, theme: oldTheme };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      localStorage.removeItem("moltpostor.theme");
      return settings;
    }
  } catch { /* ignore */ }
  
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

const LIGHT_VARS: Record<string, string> = {
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

const DARK_VARS: Record<string, string> = {
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

function applyTheme(theme: "light" | "dark") {
  const vars = theme === "dark" ? DARK_VARS : LIGHT_VARS;
  const root = document.documentElement;
  root.style.colorScheme = theme;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  document.body.style.background = vars["--color-bg"] ?? "";
  document.body.style.color = vars["--color-text"] ?? "";
}

// Singleton state to share across hook instances
let globalSettings = loadSettings();
const listeners = new Set<(s: AppSettings) => void>();

function notifyListeners() {
  for (const listener of listeners) {
    listener(globalSettings);
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(globalSettings);

  useEffect(() => {
    const listener = (s: AppSettings) => setSettingsState(s);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Apply theme on mount
  useEffect(() => {
    applyTheme(globalSettings.theme);
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    globalSettings = { ...globalSettings, ...updates };
    saveSettings(globalSettings);
    notifyListeners();
  }, []);

  const setTheme = useCallback((theme: "light" | "dark") => {
    updateSettings({ theme });
  }, [updateSettings]);

  const setWatchHistoryLimit = useCallback((limit: number) => {
    updateSettings({ watchHistoryLimit: Math.max(10, Math.min(100000, limit)) });
  }, [updateSettings]);

  return {
    settings,
    setTheme,
    setWatchHistoryLimit,
    updateSettings,
  };
}

export function getSettings(): AppSettings {
  return globalSettings;
}
