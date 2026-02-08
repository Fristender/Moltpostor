import { useState, useEffect, useCallback } from "react";
import { getSettings } from "./useSettings";

export type WatchHistoryItem = {
  id: string;
  platform: string;
  type: "post" | "user" | "submolt";
  title?: string;
  name?: string;
  author?: string;
  url?: string;
  content?: string;
  viewedAt: number;
};

const STORAGE_KEY = "moltpostor.watchHistory.v1";

function loadHistory(): WatchHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch { /* ignore */ }
  return [];
}

function saveHistory(items: WatchHistoryItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

export function useWatchHistory() {
  const [items, setItems] = useState<WatchHistoryItem[]>(loadHistory);

  useEffect(() => {
    saveHistory(items);
  }, [items]);

  const addToHistory = useCallback((item: Omit<WatchHistoryItem, "viewedAt">) => {
    setItems(prev => {
      // Remove existing entry for same item (to move it to top)
      const filtered = prev.filter(i => !(i.platform === item.platform && i.type === item.type && i.id === item.id));
      const newItems = [{ ...item, viewedAt: Date.now() }, ...filtered];
      // Limit history size based on settings
      const limit = getSettings().watchHistoryLimit;
      if (newItems.length > limit) {
        return newItems.slice(0, limit);
      }
      return newItems;
    });
  }, []);

  const removeFromHistory = useCallback((platform: string, type: string, id: string) => {
    setItems(prev => prev.filter(i => !(i.platform === platform && i.type === type && i.id === id)));
  }, []);

  const getHistoryByPlatform = useCallback((platform?: string): WatchHistoryItem[] => {
    if (!platform) return items;
    return items.filter(i => i.platform === platform);
  }, [items]);

  const clearHistory = useCallback(() => {
    setItems([]);
  }, []);

  const trimToLimit = useCallback((limit: number) => {
    setItems(prev => prev.length > limit ? prev.slice(0, limit) : prev);
  }, []);

  return { items, addToHistory, removeFromHistory, getHistoryByPlatform, clearHistory, trimToLimit };
}
