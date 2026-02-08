import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
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
import { useSettings } from "./useSettings";

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

type CachedPage = {
  key: string;
  page: Page;
  scrollTop: number;
};

const MENU_PAGES = new Set<string>(["menu", "settings", "watch-history", "saved"]);

// Root pages for each tab (back button disabled at these)
const TAB_ROOT_PAGES: Record<Tab, string> = {
  moltbook: "feed",
  menu: "menu",
};

// Logical parent mapping: what page should "back" go to?
function getLogicalParent(page: Page): Page | null {
  switch (page.kind) {
    case "feed":
    case "submolts":
    case "search":
    case "compose":
    case "login":
      return null; // Root level pages
    case "submolt":
      return { kind: "submolts" };
    case "post":
      return { kind: "feed" }; // Default to feed, but we'll use the back stack instead
    case "user":
      return { kind: "feed" };
    case "menu":
      return null; // Root
    case "settings":
    case "watch-history":
    case "saved":
      return { kind: "menu" };
    default:
      return null;
  }
}

function tabForPage(page: Page): Tab {
  if (MENU_PAGES.has(page.kind)) return "menu";
  return "moltbook";
}

function pageKey(page: Page): string {
  switch (page.kind) {
    case "feed": return "feed";
    case "submolts": return "submolts";
    case "submolt": return `submolt:${page.name}`;
    case "post": return `post:${page.id}`;
    case "user": return `user:${page.name}`;
    case "search": return `search:${page.q}`;
    case "compose": return `compose:${page.submolt ?? ""}`;
    case "login": return "login";
    case "menu": return "menu";
    case "settings": return "settings";
    case "watch-history": return "watch-history";
    case "saved": return "saved";
  }
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

function pageToHash(page: Page): string {
  switch (page.kind) {
    case "feed": return "#/feed";
    case "submolts": return "#/submolts";
    case "search": return page.q ? `#/search?q=${encodeURIComponent(page.q)}` : "#/search";
    case "submolt": return `#/m/${encodeURIComponent(page.name)}`;
    case "compose": return page.submolt ? `#/compose?submolt=${encodeURIComponent(page.submolt)}` : "#/compose";
    case "login": return "#/login";
    case "post": return `#/post/${encodeURIComponent(page.id)}`;
    case "user": return `#/u/${encodeURIComponent(page.name)}`;
    case "menu": return "#/menu";
    case "settings": return "#/settings";
    case "watch-history": return "#/watch-history";
    case "saved": return "#/saved";
  }
}

function setRoute(page: Page) {
  window.location.hash = pageToHash(page);
}

const MAX_CACHED_PAGES = 20;

export function App() {
  useSettings();
  const keyStore = useApiKeyStore();
  const [activePlatform, setActivePlatform] = useState<Platform>("moltbook");

  const activeKey = keyStore.getActiveKey(activePlatform);
  const apiKey = activeKey?.key ?? null;
  const platformKeys = keyStore.getKeysForPlatform(activePlatform);

  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const initial = parseRoute(window.location.hash);
    if (initial.kind === "compose" && !apiKey) return { kind: "login" };
    return initial.kind === "login" && apiKey ? { kind: "feed" } : initial;
  });

  const activeTab = tabForPage(currentPage);

  // Page cache: keeps visited pages mounted
  const [platformCache, setPlatformCache] = useState<CachedPage[]>(() => {
    const initial = parseRoute(window.location.hash);
    if (MENU_PAGES.has(initial.kind)) return [{ key: pageKey({ kind: "feed" }), page: { kind: "feed" }, scrollTop: 0 }];
    return [{ key: pageKey(initial), page: initial, scrollTop: 0 }];
  });
  const [menuCache, setMenuCache] = useState<CachedPage[]>(() => {
    const initial = parseRoute(window.location.hash);
    if (MENU_PAGES.has(initial.kind)) return [{ key: pageKey(initial), page: initial, scrollTop: 0 }];
    return [{ key: pageKey({ kind: "menu" }), page: { kind: "menu" }, scrollTop: 0 }];
  });

  const [activePlatformKey, setActivePlatformKey] = useState<string>(() => {
    const initial = parseRoute(window.location.hash);
    return MENU_PAGES.has(initial.kind) ? pageKey({ kind: "feed" }) : pageKey(initial);
  });
  const [activeMenuKey, setActiveMenuKey] = useState<string>(() => {
    const initial = parseRoute(window.location.hash);
    return MENU_PAGES.has(initial.kind) ? pageKey(initial) : pageKey({ kind: "menu" });
  });

  // Global navigation history (chronological, across all tabs)
  const [globalHistory, setGlobalHistory] = useState<Page[]>(() => {
    const initial = parseRoute(window.location.hash);
    return [initial];
  });
  const [globalHistoryIndex, setGlobalHistoryIndex] = useState(0);

  // Per-tab logical back stacks
  const [platformBackStack, setPlatformBackStack] = useState<Page[]>([]);
  const [menuBackStack, setMenuBackStack] = useState<Page[]>([]);

  // Refs for scroll containers per cached page
  const scrollRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const api = useMemo(() => {
    const http = new MoltbookHttpClient({
      baseUrl: DEFAULT_MOLTBOOK_BASE_URL,
      getApiKey: () => apiKey,
    });
    return new MoltbookApi(http);
  }, [apiKey]);

  const navigatingRef = useRef(false);

  const saveScrollPosition = useCallback((key: string, cache: CachedPage[], setCache: React.Dispatch<React.SetStateAction<CachedPage[]>>) => {
    const el = scrollRefs.current.get(key);
    if (el) {
      const scrollTop = el.scrollTop;
      setCache(cache.map(c => c.key === key ? { ...c, scrollTop } : c));
    }
  }, []);

  const restoreScrollPosition = useCallback((key: string) => {
    requestAnimationFrame(() => {
      const el = scrollRefs.current.get(key);
      if (el) {
        const cache = MENU_PAGES.has(parseRoute(window.location.hash).kind) ? menuCache : platformCache;
        const cached = cache.find(c => c.key === key);
        if (cached) el.scrollTop = cached.scrollTop;
      }
    });
  }, [platformCache, menuCache]);

  const applyPage = useCallback((next: Page, isBackNav: boolean = false) => {
    const nextTab = tabForPage(next);
    const prevTab = tabForPage(currentPage);
    const nextKey = pageKey(next);

    // Save current scroll position
    const currentKey = MENU_PAGES.has(currentPage.kind) ? activeMenuKey : activePlatformKey;
    if (MENU_PAGES.has(currentPage.kind)) {
      saveScrollPosition(currentKey, menuCache, setMenuCache);
    } else {
      saveScrollPosition(currentKey, platformCache, setPlatformCache);
    }

    if (MENU_PAGES.has(next.kind)) {
      // Update cache FIRST, then active key to avoid flash
      setMenuCache(prev => {
        const existing = prev.find(c => c.key === nextKey);
        if (existing) {
          if (isBackNav) {
            requestAnimationFrame(() => restoreScrollPosition(nextKey));
          }
          return prev;
        }
        const newCache = [...prev, { key: nextKey, page: next, scrollTop: 0 }];
        if (newCache.length > MAX_CACHED_PAGES) newCache.shift();
        return newCache;
      });
      setActiveMenuKey(nextKey);
    } else {
      // Update cache FIRST, then active key to avoid flash
      setPlatformCache(prev => {
        const existing = prev.find(c => c.key === nextKey);
        if (existing) {
          if (isBackNav) {
            requestAnimationFrame(() => restoreScrollPosition(nextKey));
          }
          return prev;
        }
        const newCache = [...prev, { key: nextKey, page: next, scrollTop: 0 }];
        if (newCache.length > MAX_CACHED_PAGES) newCache.shift();
        return newCache;
      });
      setActivePlatformKey(nextKey);
    }

    setCurrentPage(next);

    if (nextTab !== prevTab && isBackNav) {
      requestAnimationFrame(() => restoreScrollPosition(nextKey));
    }
  }, [currentPage, activeMenuKey, activePlatformKey, menuCache, platformCache, saveScrollPosition, restoreScrollPosition]);

  const isPrevNextRef = useRef(false);

  useEffect(() => {
    const onChange = () => {
      if (navigatingRef.current) {
        navigatingRef.current = false;
        return;
      }
      
      const next = parseRoute(window.location.hash);
      if (next.kind === "compose" && !apiKey) {
        setRoute({ kind: "login" });
        applyPage({ kind: "login" }, true);
        return;
      }
      
      // If this is from Prev/Next buttons, don't add to history
      if (isPrevNextRef.current) {
        isPrevNextRef.current = false;
        applyPage(next, true);
        return;
      }
      
      // This is a link click or browser navigation - add to global history
      setGlobalHistory(prev => {
        const truncated = prev.slice(0, globalHistoryIndex + 1);
        return [...truncated, next];
      });
      setGlobalHistoryIndex(prev => prev + 1);
      
      applyPage(next, false);
    };
    window.addEventListener("hashchange", onChange);
    if (!window.location.hash) setRoute(apiKey ? { kind: "feed" } : { kind: "login" });
    return () => window.removeEventListener("hashchange", onChange);
  }, [apiKey, applyPage, globalHistoryIndex]);

  const navigate = useCallback((p: Page, options?: { isBack?: boolean; isPrevNext?: boolean; isTabSwitch?: boolean }) => {
    const { isBack = false, isPrevNext = false, isTabSwitch = false } = options ?? {};
    navigatingRef.current = true;
    setRoute(p);
    
    // Update global history (for all navigation except prev/next which traverses existing history)
    if (!isPrevNext) {
      setGlobalHistory(prev => {
        // If we're not at the end, truncate forward history
        const truncated = prev.slice(0, globalHistoryIndex + 1);
        return [...truncated, p];
      });
      setGlobalHistoryIndex(prev => prev + 1);
    }
    
    // Update per-tab back stack (only for regular forward navigation within the same tab)
    if (!isBack && !isPrevNext && !isTabSwitch) {
      const nextTab = tabForPage(p);
      if (nextTab === "menu") {
        setMenuBackStack(prev => [...prev, currentPage]);
      } else {
        setPlatformBackStack(prev => [...prev, currentPage]);
      }
    }
    
    applyPage(p, false);
  }, [applyPage, globalHistoryIndex, currentPage]);

  // Navigation handlers
  const canGoPrev = globalHistoryIndex > 0;
  const canGoNext = globalHistoryIndex < globalHistory.length - 1;
  
  // Back button: use back stack if available, otherwise use logical parent
  const currentLogicalParent = getLogicalParent(currentPage);
  const canGoBack = activeTab === "menu" 
    ? (menuBackStack.length > 0 || currentLogicalParent !== null)
    : (platformBackStack.length > 0 || currentLogicalParent !== null);

  const handlePrev = useCallback(() => {
    if (!canGoPrev) return;
    const prevPage = globalHistory[globalHistoryIndex - 1];
    if (prevPage) {
      setGlobalHistoryIndex(prev => prev - 1);
      navigatingRef.current = true;
      setRoute(prevPage);
      applyPage(prevPage, true);
    }
  }, [canGoPrev, globalHistory, globalHistoryIndex, applyPage]);

  const handleNext = useCallback(() => {
    if (!canGoNext) return;
    const nextPage = globalHistory[globalHistoryIndex + 1];
    if (nextPage) {
      setGlobalHistoryIndex(prev => prev + 1);
      navigatingRef.current = true;
      setRoute(nextPage);
      applyPage(nextPage, true);
    }
  }, [canGoNext, globalHistory, globalHistoryIndex, applyPage]);

  const handleBack = useCallback(() => {
    if (!canGoBack) return;
    if (activeTab === "menu") {
      const backPage = menuBackStack[menuBackStack.length - 1];
      if (backPage) {
        setMenuBackStack(prev => prev.slice(0, -1));
        navigate(backPage, { isBack: true });
      } else if (currentLogicalParent) {
        navigate(currentLogicalParent, { isBack: true });
      }
    } else {
      const backPage = platformBackStack[platformBackStack.length - 1];
      if (backPage) {
        setPlatformBackStack(prev => prev.slice(0, -1));
        navigate(backPage, { isBack: true });
      } else if (currentLogicalParent) {
        navigate(currentLogicalParent, { isBack: true });
      }
    }
  }, [canGoBack, activeTab, menuBackStack, platformBackStack, currentLogicalParent, navigate]);

  const handleSwitchTab = useCallback((tab: Tab) => {
    if (tab === activeTab) return;
    // Save scroll position of current tab's active page
    const currentKey = activeTab === "menu" ? activeMenuKey : activePlatformKey;
    if (activeTab === "menu") {
      saveScrollPosition(currentKey, menuCache, setMenuCache);
    } else {
      saveScrollPosition(currentKey, platformCache, setPlatformCache);
    }

    if (tab === "menu") {
      const targetPage = menuCache.find(c => c.key === activeMenuKey)?.page ?? { kind: "menu" as const };
      navigate(targetPage, { isTabSwitch: true });
    } else {
      setActivePlatform(tab);
      const targetPage = platformCache.find(c => c.key === activePlatformKey)?.page ?? { kind: "feed" as const };
      navigate(targetPage, { isTabSwitch: true });
    }
  }, [activeTab, activeMenuKey, activePlatformKey, menuCache, platformCache, navigate, saveScrollPosition]);

  const platformNavigate = useCallback((p: Page) => navigate(p), [navigate]);
  const menuNavigate = useCallback((p: Page) => navigate(p), [navigate]);

  const renderPlatformPage = (cached: CachedPage) => {
    const { key, page } = cached;
    const isActive = key === activePlatformKey && activeTab !== "menu";
    return (
      <div
        key={key}
        ref={(el) => { scrollRefs.current.set(key, el); }}
        style={{
          display: isActive ? "block" : "none",
          height: "100%",
          overflowY: "auto",
          padding: 16,
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 24 }}>
          {page.kind === "login" && (
            <Login
              api={api}
              {...(page.initialMode ? { initialMode: page.initialMode } : {})}
              onSetKey={(k, label) => {
                keyStore.addKey(activePlatform, label, k);
                platformNavigate({ kind: "feed" });
              }}
            />
          )}
          {page.kind === "feed" && (
            <Feed
              api={api}
              isAuthed={!!apiKey}
              onOpenPost={(id) => platformNavigate({ kind: "post", id })}
              onOpenSubmolt={(name) => platformNavigate({ kind: "submolt", name })}
            />
          )}
          {page.kind === "submolts" && (
            <Submolts api={api} isAuthed={!!apiKey} onOpenSubmolt={(name) => platformNavigate({ kind: "submolt", name })} />
          )}
          {page.kind === "submolt" && (
            <SubmoltView api={api} name={page.name} onOpenPost={(id) => platformNavigate({ kind: "post", id })} />
          )}
          {page.kind === "post" && <PostView api={api} postId={page.id} />}
          {page.kind === "user" && (
            <UserProfile
              api={api}
              name={page.name}
              onOpenPost={(id) => platformNavigate({ kind: "post", id })}
              onOpenSubmolt={(name) => platformNavigate({ kind: "submolt", name })}
            />
          )}
          {page.kind === "search" && (
            <Search
              api={api}
              initialQuery={page.q}
              onSetQuery={(q) => platformNavigate({ kind: "search", q })}
              onOpenPost={(id) => platformNavigate({ kind: "post", id })}
              onOpenSubmolt={(name) => platformNavigate({ kind: "submolt", name })}
              onOpenUser={(name) => platformNavigate({ kind: "user", name })}
            />
          )}
          {page.kind === "compose" && (
            <Compose
              api={api}
              {...(page.submolt ? { initialSubmolt: page.submolt } : {})}
              onCreated={(postId) => platformNavigate({ kind: "post", id: postId })}
            />
          )}
        </div>
      </div>
    );
  };

  const renderMenuPage = (cached: CachedPage) => {
    const { key, page } = cached;
    const isActive = key === activeMenuKey && activeTab === "menu";
    return (
      <div
        key={key}
        ref={(el) => { scrollRefs.current.set(key, el); }}
        style={{
          display: isActive ? "block" : "none",
          height: "100%",
          overflowY: "auto",
          padding: 16,
        }}
      >
        <div style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 24 }}>
          {page.kind === "menu" && <MenuPage onNavigate={(p) => menuNavigate(p as Page)} />}
          {page.kind === "settings" && <SettingsPage />}
          {page.kind === "watch-history" && <WatchHistoryPage />}
          {page.kind === "saved" && <SavedPage />}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <Header
        activePlatform={activePlatform}
        activeTab={activeTab}
        page={activeTab === "menu" 
          ? (menuCache.find(c => c.key === activeMenuKey)?.page ?? { kind: "menu" })
          : (platformCache.find(c => c.key === activePlatformKey)?.page ?? { kind: "feed" })}
        isAuthed={!!apiKey}
        platformKeys={platformKeys}
        activeKey={activeKey}
        onNavigate={(p) => activeTab === "menu" ? menuNavigate(p as Page) : platformNavigate(p as Page)}
        onSwitchKey={(id) => keyStore.setActiveKey(id)}
        onRemoveKey={(id) => keyStore.removeKey(id)}
        onRefresh={() => window.location.reload()}
        canGoBack={canGoBack}
        canGoPrev={canGoPrev}
        canGoNext={canGoNext}
        onBack={handleBack}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      {/* Platform tab pages */}
      <main style={{ flex: 1, overflow: "hidden", display: activeTab === "menu" ? "none" : "block" }}>
        {platformCache.map(renderPlatformPage)}
      </main>

      {/* Menu tab pages */}
      <main style={{ flex: 1, overflow: "hidden", display: activeTab === "menu" ? "block" : "none" }}>
        {menuCache.map(renderMenuPage)}
      </main>

      <TabBar activeTab={activeTab} onSwitchTab={handleSwitchTab} />

      <footer style={{ padding: "8px 16px", fontSize: 12, opacity: 0.8, textAlign: "center", borderTop: "1px solid var(--color-border)", flexShrink: 0 }}>
        Moltpostor is a static client. Your API keys are stored in this browser only.
      </footer>
    </div>
  );
}
