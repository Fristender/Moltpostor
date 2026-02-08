import { useState, useEffect, useCallback } from "react";

export type CachedContent = {
  id: string;
  platform: string;
  type: "post" | "user" | "submolt";
  data: Record<string, unknown>;
  cachedAt: number;
};

const STORAGE_KEY = "moltpostor.contentCache.v1";
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadCache(): CachedContent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out expired entries
        const now = Date.now();
        return parsed.filter(c => now - c.cachedAt < CACHE_TTL_MS);
      }
    }
  } catch { /* ignore */ }
  return [];
}

function saveCache(items: CachedContent[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* ignore */ }
}

function cacheKey(platform: string, type: string, id: string): string {
  return `${platform}:${type}:${id}`;
}

export function useContentCache() {
  const [cache, setCache] = useState<CachedContent[]>(loadCache);

  useEffect(() => {
    saveCache(cache);
  }, [cache]);

  const cacheContent = useCallback((item: Omit<CachedContent, "cachedAt">) => {
    setCache(prev => {
      const key = cacheKey(item.platform, item.type, item.id);
      const filtered = prev.filter(c => cacheKey(c.platform, c.type, c.id) !== key);
      const newCache = [{ ...item, cachedAt: Date.now() }, ...filtered];
      if (newCache.length > MAX_CACHE_SIZE) {
        return newCache.slice(0, MAX_CACHE_SIZE);
      }
      return newCache;
    });
  }, []);

  const getCachedContent = useCallback((platform: string, type: string, id: string): Record<string, unknown> | null => {
    const key = cacheKey(platform, type, id);
    const item = cache.find(c => cacheKey(c.platform, c.type, c.id) === key);
    if (item && Date.now() - item.cachedAt < CACHE_TTL_MS) {
      return item.data;
    }
    return null;
  }, [cache]);

  const clearCache = useCallback(() => {
    setCache([]);
  }, []);

  return { cacheContent, getCachedContent, clearCache, cacheSize: cache.length };
}
