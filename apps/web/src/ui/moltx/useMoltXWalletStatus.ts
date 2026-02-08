import { useState, useEffect, useCallback } from "react";

type WalletStatus = {
  keyId: string;
  address: string | null;
  chainId: number | null;
  verifiedAt: string | null;
  checkedAt: number;
};

const STORAGE_KEY = "moltpostor.moltx.wallets.v1";

function loadWalletStatuses(): WalletStatus[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch { /* ignore */ }
  return [];
}

function saveWalletStatuses(statuses: WalletStatus[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
  } catch { /* ignore */ }
}

export function useMoltXWalletStatus() {
  const [statuses, setStatuses] = useState<WalletStatus[]>(loadWalletStatuses);

  useEffect(() => {
    saveWalletStatuses(statuses);
  }, [statuses]);

  const getWalletStatus = useCallback((keyId: string): WalletStatus | null => {
    return statuses.find(s => s.keyId === keyId) ?? null;
  }, [statuses]);

  const isWalletLinked = useCallback((keyId: string): boolean => {
    const status = statuses.find(s => s.keyId === keyId);
    return status?.address !== null && status?.address !== undefined;
  }, [statuses]);

  const setWalletStatus = useCallback((keyId: string, address: string | null, chainId: number | null, verifiedAt: string | null) => {
    setStatuses(prev => {
      const existing = prev.findIndex(s => s.keyId === keyId);
      const newStatus: WalletStatus = {
        keyId,
        address,
        chainId,
        verifiedAt,
        checkedAt: Date.now(),
      };
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = newStatus;
        return updated;
      }
      return [...prev, newStatus];
    });
  }, []);

  const removeWalletStatus = useCallback((keyId: string) => {
    setStatuses(prev => prev.filter(s => s.keyId !== keyId));
  }, []);

  const clearAll = useCallback(() => {
    setStatuses([]);
  }, []);

  return {
    getWalletStatus,
    isWalletLinked,
    setWalletStatus,
    removeWalletStatus,
    clearAll,
  };
}

export type { WalletStatus };
