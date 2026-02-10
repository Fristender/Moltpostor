import { useState, useEffect, useCallback } from "react";

type LikeRecord = {
  [postId: string]: boolean;
};

const STORAGE_KEY = "moltpostor.moltxLikes.v1";

function loadLikes(): LikeRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return {};
}

function saveLikes(likes: LikeRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(likes));
  } catch { /* ignore */ }
}

export function useMoltXLikes() {
  const [likes, setLikes] = useState<LikeRecord>(loadLikes);

  useEffect(() => {
    saveLikes(likes);
  }, [likes]);

  const isLiked = useCallback((postId: string): boolean => {
    return likes[postId] === true;
  }, [likes]);

  const setLiked = useCallback((postId: string, liked: boolean) => {
    setLikes((prev) => {
      if (!liked) {
        const { [postId]: _removed, ...rest } = prev;
        void _removed;
        return rest;
      }
      return { ...prev, [postId]: true };
    });
  }, []);

  return { isLiked, setLiked };
}
