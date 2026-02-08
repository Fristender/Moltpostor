import React, { createContext, useContext, type ReactNode } from "react";
import { useSavedItems, type SavedItem, type SavedItemType } from "./useSavedItems";
import { useWatchHistory, type WatchHistoryItem } from "./useWatchHistory";
import { useContentCache } from "./useContentCache";
import { useDisplaySettings } from "./useDisplaySettings";

type AppContextValue = {
  // Saved items
  saveItem: (item: Omit<SavedItem, "savedAt">) => void;
  unsaveItem: (platform: string, type: SavedItemType, id: string) => void;
  isSaved: (platform: string, type: SavedItemType, id: string) => boolean;
  savedItems: SavedItem[];
  getSavedByPlatform: (platform?: string) => SavedItem[];
  clearSaved: () => void;
  // Watch history
  addToHistory: (item: Omit<WatchHistoryItem, "viewedAt">) => void;
  removeFromHistory: (platform: string, type: string, id: string) => void;
  watchHistory: WatchHistoryItem[];
  getHistoryByPlatform: (platform?: string) => WatchHistoryItem[];
  clearHistory: () => void;
  trimHistory: (limit: number) => void;
  // Content cache
  cacheContent: (item: { id: string; platform: string; type: "post" | "user" | "submolt"; data: Record<string, unknown> }) => void;
  getCachedContent: (platform: string, type: string, id: string) => Record<string, unknown> | null;
  clearContentCache: () => void;
  // Display settings
  markdownEnabled: boolean;
  toggleMarkdown: () => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppContextProvider({ children }: { children: ReactNode }) {
  const saved = useSavedItems();
  const history = useWatchHistory();
  const contentCache = useContentCache();
  const display = useDisplaySettings();

  const value: AppContextValue = {
    saveItem: saved.saveItem,
    unsaveItem: saved.unsaveItem,
    isSaved: saved.isSaved,
    savedItems: saved.items,
    getSavedByPlatform: saved.getItemsByPlatform,
    clearSaved: saved.clearAll,
    addToHistory: history.addToHistory,
    removeFromHistory: history.removeFromHistory,
    watchHistory: history.items,
    getHistoryByPlatform: history.getHistoryByPlatform,
    clearHistory: history.clearHistory,
    trimHistory: history.trimToLimit,
    cacheContent: contentCache.cacheContent,
    getCachedContent: contentCache.getCachedContent,
    clearContentCache: contentCache.clearCache,
    markdownEnabled: display.markdownEnabled,
    toggleMarkdown: display.toggleMarkdown,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppContextProvider");
  return ctx;
}
