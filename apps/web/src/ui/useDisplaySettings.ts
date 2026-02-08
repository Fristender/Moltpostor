import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "moltpostor_display_settings";

export type DisplaySettings = {
  markdownEnabled: boolean;
};

const DEFAULT_SETTINGS: DisplaySettings = {
  markdownEnabled: true,
};

function loadSettings(): DisplaySettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return DEFAULT_SETTINGS;
}

function saveSettings(settings: DisplaySettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export function useDisplaySettings() {
  const [settings, setSettings] = useState<DisplaySettings>(loadSettings);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const toggleMarkdown = useCallback(() => {
    setSettings((prev) => ({ ...prev, markdownEnabled: !prev.markdownEnabled }));
  }, []);

  const setMarkdownEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, markdownEnabled: enabled }));
  }, []);

  return {
    settings,
    markdownEnabled: settings.markdownEnabled,
    toggleMarkdown,
    setMarkdownEnabled,
  };
}
