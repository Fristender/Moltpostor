import { useEffect, useState } from "react";

export type Platform = "moltbook";

export type StoredApiKey = {
  id: string;
  platform: Platform;
  label: string;
  key: string;
};

type StoreData = {
  keys: StoredApiKey[];
  activeKeyId: Partial<Record<Platform, string>>;
};

const STORE_KEY = "moltpostor.apiKeys.v1";
const LEGACY_KEY = "moltpostor.apiKey.v1";

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function loadStore(): StoreData {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        keys: Array.isArray(parsed.keys) ? parsed.keys : [],
        activeKeyId: parsed.activeKeyId ?? {},
      };
    }
  } catch { /* ignore */ }

  // Migrate from legacy single-key storage
  try {
    const legacyKey = localStorage.getItem(LEGACY_KEY);
    if (legacyKey && legacyKey.length > 0) {
      const id = generateId();
      const store: StoreData = {
        keys: [{ id, platform: "moltbook", label: "Imported key", key: legacyKey }],
        activeKeyId: { moltbook: id },
      };
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      localStorage.removeItem(LEGACY_KEY);
      return store;
    }
  } catch { /* ignore */ }

  return { keys: [], activeKeyId: {} };
}

function saveStore(store: StoreData) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

export function useApiKeyStore() {
  const [store, setStore] = useState<StoreData>(loadStore);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  function getKeysForPlatform(platform: Platform): StoredApiKey[] {
    return store.keys.filter((k) => k.platform === platform);
  }

  function getActiveKey(platform: Platform): StoredApiKey | null {
    const activeId = store.activeKeyId[platform];
    if (!activeId) return null;
    return store.keys.find((k) => k.id === activeId) ?? null;
  }

  function addKey(platform: Platform, label: string, key: string): string {
    const id = generateId();
    setStore((prev) => ({
      keys: [...prev.keys, { id, platform, label, key }],
      activeKeyId: { ...prev.activeKeyId, [platform]: id },
    }));
    return id;
  }

  function removeKey(id: string) {
    setStore((prev) => {
      const removed = prev.keys.find((k) => k.id === id);
      const keys = prev.keys.filter((k) => k.id !== id);
      const activeKeyId = { ...prev.activeKeyId };
      if (removed && activeKeyId[removed.platform] === id) {
        const remaining = keys.filter((k) => k.platform === removed.platform);
        const next = remaining[0];
        if (next) {
          activeKeyId[removed.platform] = next.id;
        } else {
          delete activeKeyId[removed.platform];
        }
      }
      return { keys, activeKeyId };
    });
  }

  function setActiveKey(id: string) {
    setStore((prev) => {
      const entry = prev.keys.find((k) => k.id === id);
      if (!entry) return prev;
      return { ...prev, activeKeyId: { ...prev.activeKeyId, [entry.platform]: id } };
    });
  }

  return { getKeysForPlatform, getActiveKey, addKey, removeKey, setActiveKey };
}
