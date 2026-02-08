import React, { useMemo, useRef, useState } from "react";
import { MoltbookApi, MoltbookHttpClient, DEFAULT_MOLTBOOK_BASE_URL } from "@moltpostor/api";
import { Feed } from "./Feed";
import { Login } from "./Login";
import { Submolts } from "./Submolts";
import { SubmoltView } from "./SubmoltView";
import { PostView } from "./PostView";
import { Compose } from "./Compose";
import { UserProfile } from "./UserProfile";
import { Search } from "./Search";
import { Header } from "./Header";
import { TabBar, type Tab } from "./TabBar";
import { MenuPage } from "./MenuPage";
import { SettingsPage } from "./SettingsPage";
import { WatchHistoryPage } from "./WatchHistoryPage";
import { SavedPage } from "./SavedPage";
import { useApiKeyStore, type Platform } from "./useApiKeyStore";
import { useTheme } from "./useTheme";

type Page =
  | { kind: "feed" }
  | { kind: "submolts" }
  | { kind: "submolt"; name: string }
  | { kind: "post"; id: string }
  | { kind: "user"; name: string }
  | { kind: "search"; q: string }
  | { kind: "compose"; submolt?: string }
  | { kind: "login"; initialMode?: "import" | "register" }
  | { kind: "menu" }
  | { kind: "settings" }
  | { kind: "watch-history" }
  | { kind: "saved" };

const MENU_PAGES = new Set<string>(["menu", "settings", "watch-history", "saved"]);

function tabForPage(page: Page): Tab {
  if (MENU_PAGES.has(page.kind)) return "menu";
  return "moltbook";
}

function parseRoute(hash: string): Page {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const fullPath = h.startsWith("/") ? h : `/${h}`;
  const split = fullPath.split("?", 2);
  const path = split[0] ?? "/";
  const query = split[1] ?? "";
  const parts = path.split("/").filter(Boolean);
  const params = new URLSearchParams(query);

  if (parts.length === 0) return { kind: "feed" };
  if (parts[0] === "feed") return { kind: "feed" };
  if (parts[0] === "submolts") return { kind: "submolts" };
  if (parts[0] === "search") return { kind: "search", q: params.get("q")?.trim() ?? "" };
  if (parts[0] === "compose") {
    const submolt = params.get("submolt")?.trim() || undefined;
    return submolt ? { kind: "compose", submolt } : { kind: "compose" };
  }
  if (parts[0] === "login") return { kind: "login" };
  if (parts[0] === "post" && parts[1]) return { kind: "post", id: decodeURIComponent(parts[1]) };
  if (parts[0] === "u" && parts[1]) return { kind: "user", name: decodeURIComponent(parts[1]) };
  if (parts[0] === "m" && parts[1]) return { kind: "submolt", name: decodeURIComponent(parts[1]) };
  if (parts[0] === "menu") return { kind: "menu" };
  if (parts[0] === "settings") return { kind: "settings" };
  if (parts[0] === "watch-history") return { kind: "watch-history" };
  if (parts[0] === "saved") return { kind: "saved" };

  return { kind: "feed" };
}

function setRoute(page: Page) {
  switch (page.kind) {
    case "feed":
      window.location.hash = "#/feed";
      return;
    case "submolts":
      window.location.hash = "#/submolts";
      return;
    case "search":
      window.location.hash = page.q ? `#/search?q=${encodeURIComponent(page.q)}` : "#/search";
      return;
    case "submolt":
      window.location.hash = `#/m/${encodeURIComponent(page.name)}`;
      return;
    case "compose":
      window.location.hash = page.submolt
        ? `#/compose?submolt=${encodeURIComponent(page.submolt)}`
        : "#/compose";
      return;
    case "login":
      window.location.hash = "#/login";
      return;
    case "post":
      window.location.hash = `#/post/${encodeURIComponent(page.id)}`;
      return;
    case "user":
      window.location.hash = `#/u/${encodeURIComponent(page.name)}`;
      return;
    case "menu":
      window.location.hash = "#/menu";
      return;
    case "settings":
      window.location.hash = "#/settings";
      return;
    case "watch-history":
      window.location.hash = "#/watch-history";
      return;
    case "saved":
      window.location.hash = "#/saved";
      return;
  }
}

export function App() {
  useTheme();
  const keyStore = useApiKeyStore();
  const [activePlatform, setActivePlatform] = useState<Platform>("moltbook");

  const activeKey = keyStore.getActiveKey(activePlatform);
  const apiKey = activeKey?.key ?? null;
  const platformKeys = keyStore.getKeysForPlatform(activePlatform);

  const [page, setPage] = useState<Page>(() => {
    const initial = parseRoute(window.location.hash);
    if (initial.kind === "compose" && !apiKey) return { kind: "login" };
    return initial.kind === "login" && apiKey ? { kind: "feed" } : initial;
  });

  const activeTab = tabForPage(page);

  const api = useMemo(() => {
    const http = new MoltbookHttpClient({
      baseUrl: DEFAULT_MOLTBOOK_BASE_URL,
      getApiKey: () => apiKey,
    });
    return new MoltbookApi(http);
  }, [apiKey]);

  const navigatingRef = useRef(false);

  React.useEffect(() => {
    const onChange = () => {
      if (navigatingRef.current) {
        navigatingRef.current = false;
        return;
      }
      const next = parseRoute(window.location.hash);
      if (next.kind === "compose" && !apiKey) {
        setRoute({ kind: "login" });
        setPage({ kind: "login" });
        return;
      }
      setPage(next);
    };
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) setRoute(apiKey ? { kind: "feed" } : { kind: "login" });
    return () => window.removeEventListener("hashchange", onChange);
  }, [apiKey]);

  const navigate = (p: Page) => {
    navigatingRef.current = true;
    setRoute(p);
    setPage(p);
  };

  const handleSwitchTab = (tab: Tab) => {
    if (tab === "menu") {
      navigate({ kind: "menu" });
    } else {
      setActivePlatform(tab);
      if (MENU_PAGES.has(page.kind)) {
        navigate({ kind: "feed" });
      }
    }
  };

  const showHeader = !MENU_PAGES.has(page.kind);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {showHeader && (
        <Header
          activePlatform={activePlatform}
          page={page}
          isAuthed={!!apiKey}
          platformKeys={platformKeys}
          activeKey={activeKey}
          onNavigate={(p) => navigate(p as Page)}
          onSwitchKey={(id) => keyStore.setActiveKey(id)}
          onRemoveKey={(id) => keyStore.removeKey(id)}
          onRefresh={() => window.location.reload()}
        />
      )}

      <main style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {page.kind === "login" && (
            <Login
              api={api}
              {...(page.initialMode ? { initialMode: page.initialMode } : {})}
              onSetKey={(key, label) => {
                keyStore.addKey(activePlatform, label, key);
                navigate({ kind: "feed" });
              }}
            />
          )}
          {page.kind === "feed" && (
            <Feed
              api={api}
              isAuthed={!!apiKey}
              onOpenPost={(id) => navigate({ kind: "post", id })}
              onOpenSubmolt={(name) => navigate({ kind: "submolt", name })}
            />
          )}
          {page.kind === "submolts" && (
            <Submolts api={api} isAuthed={!!apiKey} onOpenSubmolt={(name) => navigate({ kind: "submolt", name })} />
          )}
          {page.kind === "submolt" && (
            <SubmoltView api={api} name={page.name} onOpenPost={(id) => navigate({ kind: "post", id })} />
          )}
          {page.kind === "post" && <PostView api={api} postId={page.id} />}
          {page.kind === "user" && (
            <UserProfile
              api={api}
              name={page.name}
              onOpenPost={(id) => navigate({ kind: "post", id })}
              onOpenSubmolt={(name) => navigate({ kind: "submolt", name })}
            />
          )}
          {page.kind === "search" && (
            <Search
              api={api}
              initialQuery={page.q}
              onSetQuery={(q) => navigate({ kind: "search", q })}
              onOpenPost={(id) => navigate({ kind: "post", id })}
              onOpenSubmolt={(name) => navigate({ kind: "submolt", name })}
              onOpenUser={(name) => navigate({ kind: "user", name })}
            />
          )}
          {page.kind === "compose" && (
            <Compose
              api={api}
              {...(page.submolt ? { initialSubmolt: page.submolt } : {})}
              onCreated={(postId) => navigate({ kind: "post", id: postId })}
            />
          )}
          {page.kind === "menu" && <MenuPage onNavigate={(p) => navigate(p as Page)} />}
          {page.kind === "settings" && <SettingsPage />}
          {page.kind === "watch-history" && <WatchHistoryPage />}
          {page.kind === "saved" && <SavedPage />}
        </div>
      </main>

      <TabBar activeTab={activeTab} onSwitchTab={handleSwitchTab} />

      <footer style={{ padding: "8px 16px", fontSize: 12, opacity: 0.8, textAlign: "center", borderTop: "1px solid var(--color-border)", flexShrink: 0 }}>
        Moltpostor is a static client. Your API keys are stored in this browser only.
      </footer>
    </div>
  );
}
