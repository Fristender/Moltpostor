import React, { useState, useRef, useEffect } from "react";
import type { Platform } from "./useApiKeyStore";

export type Tab = Platform | "menu";

type TabBarProps = {
  activeTab: Tab;
  onSwitchTab: (tab: Tab) => void;
  markdownEnabled: boolean;
  onToggleMarkdown: () => void;
};

const PLATFORM_TABS: { id: Platform; label: string }[] = [
  { id: "moltbook", label: "Moltbook" },
  { id: "moltx", label: "MoltX" },
  { id: "clawstr", label: "Clawstr" },
];

export function TabBar(props: TabBarProps) {
  const activePlatform = props.activeTab === "menu" ? "moltbook" : props.activeTab;
  const activeLabel = PLATFORM_TABS.find((t) => t.id === activePlatform)?.label ?? "Platform";
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: "8px 16px",
        borderTop: "1px solid var(--color-border)",
        background: "var(--color-bg-surface)",
        flexShrink: 0,
      }}
    >
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--color-border)",
            background: "var(--color-bg-surface)",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {activeLabel}
          <span style={{ fontSize: 10 }}>{dropdownOpen ? "▲" : "▼"}</span>
        </button>
        {dropdownOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              marginBottom: 4,
              background: "var(--color-bg-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
              boxShadow: "0 -2px 8px rgba(0,0,0,0.15)",
              zIndex: 100,
              minWidth: "100%",
            }}
          >
            {PLATFORM_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  props.onSwitchTab(t.id);
                  setDropdownOpen(false);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  background: t.id === activePlatform ? "var(--color-bg-accent)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontWeight: t.id === activePlatform ? 600 : 400,
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={() => props.onSwitchTab("menu")}
        style={{
          fontWeight: props.activeTab === "menu" ? 700 : 400,
          padding: "6px 16px",
          borderRadius: 6,
          background: props.activeTab === "menu" ? "var(--color-bg-accent)" : "transparent",
          border: props.activeTab === "menu" ? "1px solid var(--color-border-strong)" : "1px solid var(--color-border)",
          cursor: "pointer",
        }}
      >
        Menu
      </button>
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
