import React from "react";
import type { Platform } from "./useApiKeyStore";

type TabBarProps = {
  activePlatform: Platform;
  onSwitchPlatform: (platform: Platform) => void;
};

const PLATFORMS: { id: Platform; label: string }[] = [
  { id: "moltbook", label: "Moltbook" },
];

export function TabBar(props: TabBarProps) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "8px 16px",
        borderTop: "1px solid #ddd",
        background: "#fff",
        flexShrink: 0,
      }}
    >
      {PLATFORMS.map((p) => (
        <button
          key={p.id}
          onClick={() => props.onSwitchPlatform(p.id)}
          style={{
            fontWeight: props.activePlatform === p.id ? 700 : 400,
            padding: "6px 16px",
            borderRadius: 6,
            background: props.activePlatform === p.id ? "#e8e8e8" : "transparent",
            border: props.activePlatform === p.id ? "1px solid #ccc" : "1px solid transparent",
            cursor: "pointer",
          }}
        >
          {p.label}
        </button>
      ))}
    </nav>
  );
}
