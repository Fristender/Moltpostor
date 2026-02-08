import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { MoltbookApi, MoltbookHttpClient, DEFAULT_MOLTBOOK_BASE_URL, MoltXApi, DEFAULT_MOLTX_BASE_URL } from "@moltpostor/api";
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
import { useAppContext } from "./AppContext";
import {
  MoltXFeed,
  MoltXPostView,
  MoltXProfile,
  MoltXCompose,
  MoltXSearch,
  MoltXNotifications,
  MoltXLeaderboard,
  MoltXLogin,
  MoltXHashtagFeed,
  MoltXWalletLink,
  useMoltXWalletStatus,
} from "./moltx";

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
  | { kind: "saved" }
  // MoltX pages
  | { kind: "moltx-feed" }
  | { kind: "moltx-post"; id: string }
  | { kind: "moltx-user"; name: string }
  | { kind: "moltx-search"; q: string }
  | { kind: "moltx-compose" }
  | { kind: "moltx-login"; initialMode?: "import" | "register" }
  | { kind: "moltx-notifications" }
  | { kind: "moltx-leaderboard" }
  | { kind: "moltx-hashtag"; tag: string };

type CachedPage = {
  key: string;
  page: Page;
  scrollTop: number;
};

const MENU_PAGES = new Set<string>(["menu", "settings", "watch-history", "saved"]);
const MOLTX_PAGES = new Set<string>(["moltx-feed", "moltx-post", "moltx-user", "moltx-search", "moltx-compose", "moltx-login", "moltx-notifications", "moltx-leaderboard", "moltx-hashtag"]);

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
    // MoltX pages
    case "moltx-feed":
    case "moltx-search":
    case "moltx-compose":
    case "moltx-login":
    case "moltx-notifications":
    case "moltx-leaderboard":
    case "moltx-hashtag":
      return null; // Root level MoltX pages
    case "moltx-post":
      return { kind: "moltx-feed" };
    case "moltx-user":
      return { kind: "moltx-feed" };
    default:
      return null;
  }
}

function tabForPage(page: Page): Tab {
  if (MENU_PAGES.has(page.kind)) return "menu";
  if (MOLTX_PAGES.has(page.kind)) return "moltx";
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
    // MoltX pages
    case "moltx-feed": return "moltx-feed";
    case "moltx-post": return `moltx-post:${page.id}`;
    case "moltx-user": return `moltx-user:${page.name}`;
    case "moltx-search": return `moltx-search:${page.q}`;
    case "moltx-compose": return "moltx-compose";
    case "moltx-login": return "moltx-login";
    case "moltx-notifications": return "moltx-notifications";
    case "moltx-leaderboard": return "moltx-leaderboard";
    case "moltx-hashtag": return `moltx-hashtag:${page.tag}`;
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
  // MoltX routes
  if (parts[0] === "moltx") {
    if (parts.length === 1 || parts[1] === "feed") return { kind: "moltx-feed" };
    if (parts[1] === "post" && parts[2]) return { kind: "moltx-post", id: decodeURIComponent(parts[2]) };
    if (parts[1] === "user" && parts[2]) return { kind: "moltx-user", name: decodeURIComponent(parts[2]) };
    if (parts[1] === "search") return { kind: "moltx-search", q: params.get("q")?.trim() ?? "" };
    if (parts[1] === "compose") return { kind: "moltx-compose" };
    if (parts[1] === "login") return { kind: "moltx-login" };
    if (parts[1] === "notifications") return { kind: "moltx-notifications" };
    if (parts[1] === "leaderboard") return { kind: "moltx-leaderboard" };
    if (parts[1] === "hashtag" && parts[2]) return { kind: "moltx-hashtag", tag: decodeURIComponent(parts[2]) };
    return { kind: "moltx-feed" };
  }

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
    // MoltX routes
    case "moltx-feed": return "#/moltx/feed";
    case "moltx-post": return `#/moltx/post/${encodeURIComponent(page.id)}`;
    case "moltx-user": return `#/moltx/user/${encodeURIComponent(page.name)}`;
    case "moltx-search": return page.q ? `#/moltx/search?q=${encodeURIComponent(page.q)}` : "#/moltx/search";
    case "moltx-compose": return "#/moltx/compose";
    case "moltx-login": return "#/moltx/login";
    case "moltx-notifications": return "#/moltx/notifications";
    case "moltx-leaderboard": return "#/moltx/leaderboard";
    case "moltx-hashtag": return `#/moltx/hashtag/${encodeURIComponent(page.tag)}`;
  }
}

function setRoute(page: Page) {
  window.location.hash = pageToHash(page);
}

const MAX_CACHED_PAGES = 20;

export function App() {
  useSettings();
  const keyStore = useApiKeyStore();
  const { markdownEnabled, toggleMarkdown, saveItem, unsaveItem, isSaved } = useAppContext();
  const [activePlatform, setActivePlatform] = useState<Platform>(() => {
    const initial = parseRoute(window.location.hash);
    return MOLTX_PAGES.has(initial.kind) ? "moltx" : "moltbook";
  });

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

  // MoltX API
  const moltxApiKey = keyStore.getActiveKey("moltx")?.key ?? null;
  const moltxApi = useMemo(() => {
    const http = new MoltbookHttpClient({
      baseUrl: DEFAULT_MOLTX_BASE_URL,
      getApiKey: () => moltxApiKey,
    });
    return new MoltXApi(http);
  }, [moltxApiKey]);

  // Wallet linking modal state
  const [showWalletLink, setShowWalletLink] = useState(false);
  const [walletLinkKeyId, setWalletLinkKeyId] = useState<string | null>(null);
  const walletStatus = useMoltXWalletStatus();

  const handleLinkWallet = useCallback((keyId: string) => {
    setWalletLinkKeyId(keyId);
    setShowWalletLink(true);
  }, []);

  // Check wallet status for a MoltX key from API
  const checkWalletStatus = useCallback(async (keyId: string, apiKey: string) => {
    try {
      const http = new MoltbookHttpClient({
        baseUrl: DEFAULT_MOLTX_BASE_URL,
        getApiKey: () => apiKey,
      });
      const api = new MoltXApi(http);
      const res = await api.getMyProfile();
      const agent = res.agent;
      if (agent?.metadata) {
        try {
          const meta = typeof agent.metadata === "string" ? JSON.parse(agent.metadata) : agent.metadata;
          if (meta?.evm_wallet?.address) {
            walletStatus.setWalletStatus(
              keyId,
              meta.evm_wallet.address,
              meta.evm_wallet.chain_id ?? null,
              meta.evm_wallet.verified_at ?? null
            );
            return true;
          }
        } catch { /* ignore parse errors */ }
      }
      walletStatus.setWalletStatus(keyId, null, null, null);
      return false;
    } catch {
      return false;
    }
  }, [walletStatus]);

  // Check wallet status for all MoltX keys on mount
  useEffect(() => {
    const moltxKeys = keyStore.getKeysForPlatform("moltx");
    moltxKeys.forEach((k) => {
      const existing = walletStatus.getWalletStatus(k.id);
      // Only check if not checked in the last hour
      if (!existing || Date.now() - existing.checkedAt > 3600000) {
        checkWalletStatus(k.id, k.key);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getWalletAddress = useCallback((keyId: string): string | null => {
    return walletStatus.getWalletStatus(keyId)?.address ?? null;
  }, [walletStatus]);

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
    } else if (tab === "moltx") {
      setActivePlatform("moltx");
      const moltxPage = platformCache.find(c => c.key.startsWith("moltx-"))?.page ?? { kind: "moltx-feed" as const };
      navigate(moltxPage, { isTabSwitch: true });
    } else {
      setActivePlatform(tab);
      const targetPage = platformCache.find(c => c.key === activePlatformKey && !c.key.startsWith("moltx-"))?.page ?? { kind: "feed" as const };
      navigate(targetPage, { isTabSwitch: true });
    }
  }, [activeTab, activeMenuKey, activePlatformKey, menuCache, platformCache, navigate, saveScrollPosition]);

  const platformNavigate = useCallback((p: Page) => navigate(p), [navigate]);
  const menuNavigate = useCallback((p: Page) => navigate(p), [navigate]);
  const moltxNavigate = useCallback((p: Page) => navigate(p), [navigate]);

  const renderPlatformPage = (cached: CachedPage) => {
    const { key, page } = cached;
    const isMoltxPage = MOLTX_PAGES.has(page.kind);
    const isActive = key === activePlatformKey && activeTab !== "menu" && (
      (activeTab === "moltx" && isMoltxPage) || (activeTab === "moltbook" && !isMoltxPage)
    );
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
          {/* Moltbook pages */}
          {page.kind === "login" && (
            <Login
              api={api}
              {...(page.initialMode ? { initialMode: page.initialMode } : {})}
              onSetKey={(k, label) => {
                keyStore.addKey("moltbook", label, k);
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
          {/* MoltX pages */}
          {page.kind === "moltx-login" && (
            <MoltXLogin
              api={moltxApi}
              {...(page.initialMode ? { initialMode: page.initialMode } : {})}
              onSetKey={(k, label) => {
                const keyId = keyStore.addKey("moltx", label, k);
                // Check wallet status for the new key
                checkWalletStatus(keyId, k);
                moltxNavigate({ kind: "moltx-feed" });
              }}
            />
          )}
          {page.kind === "moltx-feed" && (
            <MoltXFeed
              api={moltxApi}
              isAuthed={!!moltxApiKey}
              onOpenPost={(id) => moltxNavigate({ kind: "moltx-post", id })}
              onOpenUser={(name) => moltxNavigate({ kind: "moltx-user", name })}
              onOpenHashtag={(tag) => moltxNavigate({ kind: "moltx-hashtag", tag })}
              onCompose={() => moltxNavigate({ kind: "moltx-compose" })}
              onSavePost={(post) => {
                if (isSaved("moltx", "post", post.id)) {
                  unsaveItem("moltx", "post", post.id);
                } else {
                  saveItem({
                    id: post.id,
                    platform: "moltx",
                    type: "post",
                    content: post.content ?? "",
                    author: post.author?.name ?? post.author_name ?? "",
                  });
                }
              }}
              isPostSaved={(id) => isSaved("moltx", "post", id)}
            />
          )}
          {page.kind === "moltx-post" && (
            <MoltXPostView
              api={moltxApi}
              postId={page.id}
              isAuthed={!!moltxApiKey}
              onOpenPost={(id) => moltxNavigate({ kind: "moltx-post", id })}
              onOpenUser={(name) => moltxNavigate({ kind: "moltx-user", name })}
            />
          )}
          {page.kind === "moltx-user" && (
            <MoltXProfile
              api={moltxApi}
              name={page.name}
              isAuthed={!!moltxApiKey}
              onOpenPost={(id) => moltxNavigate({ kind: "moltx-post", id })}
              onOpenUser={(name) => moltxNavigate({ kind: "moltx-user", name })}
            />
          )}
          {page.kind === "moltx-search" && (
            <MoltXSearch
              api={moltxApi}
              initialQuery={page.q}
              isAuthed={!!moltxApiKey}
              onSetQuery={(q) => moltxNavigate({ kind: "moltx-search", q })}
              onOpenPost={(id) => moltxNavigate({ kind: "moltx-post", id })}
              onOpenUser={(name) => moltxNavigate({ kind: "moltx-user", name })}
            />
          )}
          {page.kind === "moltx-compose" && (
            <MoltXCompose
              api={moltxApi}
              onCreated={(postId) => moltxNavigate({ kind: "moltx-post", id: postId })}
            />
          )}
          {page.kind === "moltx-notifications" && (
            <MoltXNotifications
              api={moltxApi}
              onOpenPost={(id) => moltxNavigate({ kind: "moltx-post", id })}
              onOpenUser={(name) => moltxNavigate({ kind: "moltx-user", name })}
            />
          )}
          {page.kind === "moltx-leaderboard" && (
            <MoltXLeaderboard
              api={moltxApi}
              onOpenUser={(name) => moltxNavigate({ kind: "moltx-user", name })}
            />
          )}
          {page.kind === "moltx-hashtag" && (
            <MoltXHashtagFeed
              api={moltxApi}
              hashtag={page.tag}
              isAuthed={!!moltxApiKey}
              onOpenPost={(id) => moltxNavigate({ kind: "moltx-post", id })}
              onOpenUser={(name) => moltxNavigate({ kind: "moltx-user", name })}
              onOpenHashtag={(tag) => moltxNavigate({ kind: "moltx-hashtag", tag })}
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
        onLinkWallet={handleLinkWallet}
        isWalletLinked={walletStatus.isWalletLinked}
        getWalletAddress={getWalletAddress}
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

      <TabBar activeTab={activeTab} onSwitchTab={handleSwitchTab} markdownEnabled={markdownEnabled} onToggleMarkdown={toggleMarkdown} />

      <footer style={{ padding: "8px 16px", fontSize: 12, opacity: 0.8, textAlign: "center", borderTop: "1px solid var(--color-border)", flexShrink: 0 }}>
        Moltpostor is a static client. Your API keys are stored in this browser only.
      </footer>

      {showWalletLink && walletLinkKeyId && (() => {
        const selectedKey = keyStore.getKeysForPlatform("moltx").find(k => k.id === walletLinkKeyId);
        if (!selectedKey) return null;
        const walletLinkHttp = new MoltbookHttpClient({
          baseUrl: DEFAULT_MOLTX_BASE_URL,
          getApiKey: () => selectedKey.key,
        });
        const walletLinkApi = new MoltXApi(walletLinkHttp);
        return (
          <MoltXWalletLink
            api={walletLinkApi}
            onClose={() => { setShowWalletLink(false); setWalletLinkKeyId(null); }}
            onLinked={() => { 
              setShowWalletLink(false); 
              setWalletLinkKeyId(null);
              // Refresh wallet status after linking
              checkWalletStatus(selectedKey.id, selectedKey.key);
            }}
          />
        );
      })()}
    </div>
  );
}
