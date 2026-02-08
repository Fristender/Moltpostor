import React from "react";
import { useTheme } from "./useTheme";

export function SettingsPage() {
  const [theme, setTheme] = useTheme();

  return (
    <section>
      <h2>Settings</h2>
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div>
            <div style={{ fontWeight: 600 }}>Theme</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Switch between light and dark mode</div>
          </div>
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as "light" | "dark")}
            style={{ padding: "4px 8px", borderRadius: 4 }}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </section>
  );
}
