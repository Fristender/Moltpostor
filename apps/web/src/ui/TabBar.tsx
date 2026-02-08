import React from "react";
import type { Platform } from "./useApiKeyStore";

export type Tab = Platform | "menu";

type TabBarProps = {
  activeTab: Tab;
  onSwitchTab: (tab: Tab) => void;
  markdownEnabled: boolean;
  onToggleMarkdown: () => void;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "moltbook", label: "Moltbook" },
  { id: "moltx", label: "MoltX" },
  { id: "menu", label: "Menu" },
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
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-bg-surface)",
        flexShrink: 0,
      }}
    >
      {TABS.map((t) => (
        <button
          key={t.id}
          onClick={() => props.onSwitchTab(t.id)}
          style={{
            fontWeight: props.activeTab === t.id ? 700 : 400,
            padding: "6px 16px",
            borderRadius: 6,
            background: props.activeTab === t.id ? "var(--color-bg-accent)" : "transparent",
            border: props.activeTab === t.id ? "1px solid var(--color-border-strong)" : "1px solid transparent",
            cursor: "pointer",
          }}
        >
          {t.label}
        </button>
      ))}
      <button
        onClick={props.onToggleMarkdown}
        title={props.markdownEnabled ? "Markdown enabled (click to show raw)" : "Markdown disabled (click to enable)"}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          background: props.markdownEnabled ? "var(--color-bg-accent)" : "transparent",
          border: props.markdownEnabled ? "1px solid var(--color-border-strong)" : "1px solid var(--color-border)",
          cursor: "pointer",
          fontWeight: props.markdownEnabled ? 700 : 400,
          fontSize: 12,
        }}
      >
        MD
      </button>
    </nav>
  );
}
