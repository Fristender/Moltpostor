import { useEffect, useState } from "react";

const KEY = "moltpostor.apiKey.v1";

export function useStoredApiKey(): [string | null, (k: string | null) => void] {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    try {
      const v = localStorage.getItem(KEY);
      return v && v.length > 0 ? v : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (apiKey) localStorage.setItem(KEY, apiKey);
      else localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }, [apiKey]);

  return [apiKey, setApiKeyState];
}

