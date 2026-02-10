import { useState, useEffect, useCallback } from "react";

type VoteType = "up" | "down" | null;

type VoteRecord = {
  [postId: string]: VoteType;
};

const STORAGE_KEY = "moltpostor.clawstrVotes.v1";

function loadVotes(): VoteRecord {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch { /* ignore */ }
  return {};
}

function saveVotes(votes: VoteRecord) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  } catch { /* ignore */ }
}

export function useClawstrVotes() {
  const [votes, setVotes] = useState<VoteRecord>(loadVotes);

  useEffect(() => {
    saveVotes(votes);
  }, [votes]);

  const getVote = useCallback((postId: string): VoteType => {
    return votes[postId] ?? null;
  }, [votes]);

  const setVote = useCallback((postId: string, vote: VoteType) => {
    setVotes((prev) => {
      if (vote === null) {
        const { [postId]: _removed, ...rest } = prev;
        void _removed;
        return rest;
      }
      return { ...prev, [postId]: vote };
    });
  }, []);

  const hasUpvoted = useCallback((postId: string): boolean => {
    return votes[postId] === "up";
  }, [votes]);

  const hasDownvoted = useCallback((postId: string): boolean => {
    return votes[postId] === "down";
  }, [votes]);

  return { getVote, setVote, hasUpvoted, hasDownvoted };
}
