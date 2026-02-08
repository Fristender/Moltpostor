import { useState, useEffect, useCallback } from "react";

export type SavedItemType = "post" | "comment";

export type SavedItem = {
  id: string;
  platform: string;
  type: SavedItemType;
  title?: string;
  content?: string;
  author?: string;
  url?: string;
  parentId?: string;
  savedAt: number;
};

const STORAGE_KEY = "moltpostor.saved.v1";

function loadSavedItems(): SavedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch { /* ignore */ }
  return [];
}

function saveSavedItems(items: SavedItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

export function useSavedItems() {
  const [items, setItems] = useState<SavedItem[]>(loadSavedItems);

  useEffect(() => {
    saveSavedItems(items);
  }, [items]);

  const saveItem = useCallback((item: Omit<SavedItem, "savedAt">) => {
    setItems(prev => {
      const exists = prev.some(i => i.platform === item.platform && i.type === item.type && i.id === item.id);
      if (exists) return prev;
      return [{ ...item, savedAt: Date.now() }, ...prev];
    });
  }, []);

  const unsaveItem = useCallback((platform: string, type: SavedItemType, id: string) => {
    setItems(prev => prev.filter(i => !(i.platform === platform && i.type === type && i.id === id)));
  }, []);

  const isSaved = useCallback((platform: string, type: SavedItemType, id: string): boolean => {
    return items.some(i => i.platform === platform && i.type === type && i.id === id);
  }, [items]);

  const getItemsByPlatform = useCallback((platform?: string): SavedItem[] => {
    if (!platform) return items;
    return items.filter(i => i.platform === platform);
  }, [items]);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  return { items, saveItem, unsaveItem, isSaved, getItemsByPlatform, clearAll };
}
