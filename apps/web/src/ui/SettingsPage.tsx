import React, { useState } from "react";
import { useSettings } from "./useSettings";
import { useAppContext } from "./AppContext";

export function SettingsPage() {
  const { settings, setTheme, setWatchHistoryLimit } = useSettings();
  const { watchHistory, trimHistory } = useAppContext();
  const [limitInput, setLimitInput] = useState(String(settings.watchHistoryLimit));
  const [showTrimWarning, setShowTrimWarning] = useState(false);

  const handleLimitChange = (value: string) => {
    setLimitInput(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 10 && num <= 100000) {
      if (num < watchHistory.length) {
        setShowTrimWarning(true);
      } else {
        setShowTrimWarning(false);
        setWatchHistoryLimit(num);
      }
    }
  };

  const confirmTrim = () => {
    const num = parseInt(limitInput, 10);
    if (!isNaN(num)) {
      setWatchHistoryLimit(num);
      trimHistory(num);
      setShowTrimWarning(false);
    }
  };

  return (
    <section>
      <h2>Settings</h2>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, border: "1px solid var(--color-border)", borderRadius: 8 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Theme</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Switch between light and dark mode</div>
          </div>
          <select
            value={settings.theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark")}
            style={{ padding: "4px 8px", borderRadius: 4 }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>

        <div style={{ padding: 12, border: "1px solid var(--color-border)", borderRadius: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 600 }}>Watch History Limit</div>
              <div style={{ fontSize: 13, opacity: 0.7 }}>
                Maximum number of items to keep in history (10 - 100,000)
              </div>
              <div style={{ fontSize: 12, opacity: 0.5, marginTop: 4 }}>
                Current: {watchHistory.length} items
              </div>
            </div>
            <input
              type="number"
              min={10}
              max={100000}
              value={limitInput}
              onChange={(e) => handleLimitChange(e.target.value)}
              style={{ width: 100, padding: "4px 8px", borderRadius: 4 }}
            />
          </div>
          {showTrimWarning && (
            <div style={{ marginTop: 12, padding: 8, background: "var(--color-bg-accent)", borderRadius: 4 }}>
              <div style={{ fontSize: 13, marginBottom: 8 }}>
                This will remove {watchHistory.length - parseInt(limitInput, 10)} older items from your history.
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={confirmTrim} style={{ color: "crimson" }}>
                  Confirm
                </button>
                <button onClick={() => { setShowTrimWarning(false); setLimitInput(String(settings.watchHistoryLimit)); }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
