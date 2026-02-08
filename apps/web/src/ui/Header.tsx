import React, { useRef, useState, useEffect } from "react";
import type { Platform, StoredApiKey } from "./useApiKeyStore";

type HeaderProps = {
  activePlatform: Platform;
  page: { kind: string; [k: string]: any };
  isAuthed: boolean;
  platformKeys: StoredApiKey[];
  activeKey: StoredApiKey | null;
  onNavigate: (page: { kind: string; [k: string]: any }) => void;
  onSwitchKey: (id: string) => void;
  onRemoveKey: (id: string) => void;
  onRefresh: () => void;
};

type NavPage = { kind: string; [k: string]: any };

const PLATFORM_NAV: Record<Platform, { label: string; page: NavPage }[]> = {
  moltbook: [
    { label: "Feed", page: { kind: "feed" } },
    { label: "Submolts", page: { kind: "submolts" } },
    { label: "Search", page: { kind: "search", q: "" } },
    { label: "+ Post", page: { kind: "compose" } },
  ],
};

export function Header(props: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [revealedKeyId, setRevealedKeyId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmRemoveId(null);
        setRevealedKeyId(null);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  const navItems = PLATFORM_NAV[props.activePlatform] ?? [];

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg-surface)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {navItems.map((item) => {
          const isCompose = item.page.kind === "compose";
          return (
            <button
              key={item.label}
              onClick={() => {
                if (isCompose && props.page.kind === "submolt") {
                  props.onNavigate({ kind: "compose", submolt: props.page.name });
                } else {
                  props.onNavigate(item.page);
                }
              }}
              disabled={isCompose && !props.isAuthed}
              style={{
                fontWeight: props.page.kind === item.page.kind ? 700 : 400,
              }}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={props.onRefresh}>Refresh</button>

        <div ref={menuRef} style={{ position: "relative" }}>
          <button onClick={() => { setMenuOpen((v) => !v); setConfirmRemoveId(null); setRevealedKeyId(null); }}>
            {props.activeKey ? props.activeKey.label : "No key"}
            {" \u25BE"}
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 4,
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-strong)",
                borderRadius: 6,
                boxShadow: "0 4px 12px var(--color-shadow)",
                minWidth: 220,
                zIndex: 100,
                padding: 8,
              }}
            >
              {props.platformKeys.length > 0 && (
                <>
                  <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 4, padding: "0 4px" }}>
                    API Keys
                  </div>
                  {props.platformKeys.map((k) => (
                    <div key={k.id}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 4,
                          padding: "4px",
                          borderRadius: 4,
                          background: k.id === props.activeKey?.id ? "var(--color-bg-accent)" : "transparent",
                        }}
                      >
                        <button
                          onClick={() => {
                            props.onSwitchKey(k.id);
                            setMenuOpen(false);
                          }}
                          style={{
                            flex: 1,
                            textAlign: "left",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: "2px 4px",
                            fontWeight: k.id === props.activeKey?.id ? 700 : 400,
                          }}
                        >
                          {k.label}
                        </button>
                        <button
                          onClick={() => setRevealedKeyId(revealedKeyId === k.id ? null : k.id)}
                          title={revealedKeyId === k.id ? "Hide key" : "Show key"}
                          style={{ fontSize: 13, opacity: 0.7, background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                        >
                          {revealedKeyId === k.id ? "\u{1F441}\u{FE0F}" : "\u{1F441}"}
                        </button>
                        {confirmRemoveId === k.id ? (
                          <span style={{ display: "flex", gap: 2 }}>
                            <button
                              onClick={() => {
                                props.onRemoveKey(k.id);
                                setConfirmRemoveId(null);
                                setRevealedKeyId(null);
                              }}
                              style={{ fontSize: 11, color: "crimson" }}
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmRemoveId(null)}
                              style={{ fontSize: 11 }}
                            >
                              Cancel
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmRemoveId(k.id)}
                            style={{ fontSize: 11, opacity: 0.7 }}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      {revealedKeyId === k.id && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 4px 4px", fontSize: 11 }}>
                          <code style={{ flex: 1, wordBreak: "break-all", padding: "2px 4px", background: "var(--color-bg-code)", borderRadius: 3 }}>
                            {k.key}
                          </code>
                          <button
                            onClick={() => navigator.clipboard?.writeText(k.key)}
                            style={{ fontSize: 11, whiteSpace: "nowrap" }}
                          >
                            Copy
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <hr style={{ margin: "6px 0" }} />
                </>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    props.onNavigate({ kind: "login", initialMode: "import" });
                  }}
                  style={{ textAlign: "left", padding: "4px 8px" }}
                >
                  Login (import key)
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    props.onNavigate({ kind: "login", initialMode: "register" });
                  }}
                  style={{ textAlign: "left", padding: "4px 8px" }}
                >
                  Register
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
