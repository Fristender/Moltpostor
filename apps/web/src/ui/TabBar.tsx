import React from "react";
import type { Platform } from "./useApiKeyStore";

export type Tab = Platform | "menu";

type TabBarProps = {
  activeTab: Tab;
  onSwitchTab: (tab: Tab) => void;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "moltbook", label: "Moltbook" },
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
    </nav>
  );
}
