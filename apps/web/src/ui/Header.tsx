import React, { useRef, useState, useEffect } from "react";
import type { Platform, StoredApiKey } from "./useApiKeyStore";
import type { Tab } from "./TabBar";

type PageType = { kind: string; [k: string]: unknown };

type HeaderProps = {
  activePlatform: Platform;
  activeTab: Tab;
  page: PageType;
  isAuthed: boolean;
  platformKeys: StoredApiKey[];
  activeKey: StoredApiKey | null;
  onNavigate: (page: PageType) => void;
  onSwitchKey: (id: string) => void;
  onRemoveKey: (id: string) => void;
  onRefresh: () => void;
  // Navigation
  canGoBack: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onPrev: () => void;
  onNext: () => void;
};

type NavPage = { kind: string; [k: string]: unknown };

const PLATFORM_NAV: Record<Platform, { label: string; page: NavPage }[]> = {
  moltbook: [
    { label: "Feed", page: { kind: "feed" } },
    { label: "Submolts", page: { kind: "submolts" } },
    { label: "Search", page: { kind: "search", q: "" } },
    { label: "+ Post", page: { kind: "compose" } },
  ],
};

type GoToType = "post" | "user" | "submolt";

export function Header(props: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [revealedKeyId, setRevealedKeyId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [goToOpen, setGoToOpen] = useState(false);
  const [goToType, setGoToType] = useState<GoToType>("post");
  const [goToValue, setGoToValue] = useState("");
  const goToRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!goToOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (goToRef.current && !goToRef.current.contains(e.target as Node)) {
        setGoToOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [goToOpen]);

  const handleGoTo = () => {
    const val = goToValue.trim();
    if (!val) return;
    if (goToType === "post") {
      props.onNavigate({ kind: "post", id: val });
    } else if (goToType === "user") {
      props.onNavigate({ kind: "user", name: val });
    } else if (goToType === "submolt") {
      props.onNavigate({ kind: "submolt", name: val });
    }
    setGoToOpen(false);
    setGoToValue("");
  };

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
        flexWrap: "wrap",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={props.onPrev}
          disabled={!props.canGoPrev}
          title="Previous page (chronological)"
          style={{ padding: "4px 8px", opacity: props.canGoPrev ? 1 : 0.4 }}
        >
          &larr;
        </button>
        <button
          onClick={props.onNext}
          disabled={!props.canGoNext}
          title="Next page (chronological)"
          style={{ padding: "4px 8px", opacity: props.canGoNext ? 1 : 0.4 }}
        >
          &rarr;
        </button>
        <button
          onClick={props.onBack}
          disabled={!props.canGoBack}
          title="Back (logical parent)"
          style={{ padding: "4px 8px", opacity: props.canGoBack ? 1 : 0.4 }}
        >
          &uarr;
        </button>
        <div style={{ width: 1, height: 20, background: "var(--color-border)", margin: "0 4px" }} />
        {props.activeTab !== "menu" && navItems.map((item) => {
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
        {props.activeTab !== "menu" && (
          <div ref={goToRef} style={{ position: "relative" }}>
            <button onClick={() => setGoToOpen((v) => !v)}>Go to</button>
            {goToOpen && (
              <div
                style={{
                  position: "fixed",
                  top: "auto",
                  left: 16,
                  right: 16,
                  marginTop: 4,
                  background: "var(--color-bg-surface)",
                  border: "1px solid var(--color-border-strong)",
                  borderRadius: 6,
                  boxShadow: "0 4px 12px var(--color-shadow)",
                  maxWidth: 280,
                  zIndex: 100,
                  padding: 8,
                  boxSizing: "border-box",
                }}
              >
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>Type</label>
                  <select
                    value={goToType}
                    onChange={(e) => setGoToType(e.target.value as GoToType)}
                    style={{ width: "100%", padding: "4px 8px", borderRadius: 4 }}
                  >
                    <option value="post">Post ID</option>
                    <option value="user">Username</option>
                    <option value="submolt">Submolt</option>
                  </select>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                    {goToType === "post" ? "Post ID" : goToType === "user" ? "Username" : "Submolt name"}
                  </label>
                  <input
                    type="text"
                    value={goToValue}
                    onChange={(e) => setGoToValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleGoTo(); }}
                    placeholder={goToType === "post" ? "Enter post ID" : goToType === "user" ? "Enter username" : "Enter submolt name"}
                    style={{ width: "100%", padding: "4px 8px", borderRadius: 4, boxSizing: "border-box" }}
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleGoTo}
                  disabled={!goToValue.trim()}
                  style={{ width: "100%", padding: "6px 8px" }}
                >
                  Go
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={props.onRefresh}>Refresh</button>

        {props.activeTab !== "menu" && (
          <div ref={menuRef} style={{ position: "relative" }}>
            <button onClick={() => { setMenuOpen((v) => !v); setConfirmRemoveId(null); setRevealedKeyId(null); }}>
              {props.activeKey ? props.activeKey.label : "No key"}
              {" \u25BE"}
            </button>

          {menuOpen && (
            <div
              style={{
                position: "fixed",
                top: "auto",
                left: 16,
                right: 16,
                marginTop: 4,
                background: "var(--color-bg-surface)",
                border: "1px solid var(--color-border-strong)",
                borderRadius: 6,
                boxShadow: "0 4px 12px var(--color-shadow)",
                maxWidth: 280,
                zIndex: 100,
                padding: 8,
                boxSizing: "border-box",
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
        )}
      </div>
    </header>
  );
}
