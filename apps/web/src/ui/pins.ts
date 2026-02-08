import type { MoltbookAgentResponse, MoltbookSubmoltResponse } from "@moltpostor/core";

const PINNED_AGENTS_KEY = "moltpostor.pinnedAgents.v1";
const PINNED_SUBMOLTS_KEY = "moltpostor.pinnedSubmolts.v1";
const FOLLOWING_KEY = "moltpostor.following.v1";
const SUBSCRIPTIONS_KEY = "moltpostor.subscriptions.v1";

function getList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setList(key: string, list: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function addToList(key: string, name: string): void {
  const list = getList(key).filter((n) => n !== name);
  list.unshift(name);
  setList(key, list);
}

function removeFromList(key: string, name: string): void {
  setList(key, getList(key).filter((n) => n !== name));
}

// Pinned agents
export function getPinnedAgents(): string[] {
  return getList(PINNED_AGENTS_KEY);
}

export function isAgentPinned(name: string): boolean {
  return getPinnedAgents().includes(name);
}

export function pinAgent(name: string): void {
  addToList(PINNED_AGENTS_KEY, name);
}

export function unpinAgent(name: string): void {
  removeFromList(PINNED_AGENTS_KEY, name);
}

// Pinned submolts
export function getPinnedSubmolts(): string[] {
  return getList(PINNED_SUBMOLTS_KEY);
}

export function isSubmoltPinned(name: string): boolean {
  return getPinnedSubmolts().includes(name);
}

export function pinSubmolt(name: string): void {
  addToList(PINNED_SUBMOLTS_KEY, name);
}

export function unpinSubmolt(name: string): void {
  removeFromList(PINNED_SUBMOLTS_KEY, name);
}

// Follow state (cached locally, updated from API responses)
export function getFollowing(): string[] {
  return getList(FOLLOWING_KEY);
}

export function isFollowing(name: string): boolean {
  return getFollowing().includes(name);
}

export function setFollowing(name: string, following: boolean): void {
  if (following) addToList(FOLLOWING_KEY, name);
  else removeFromList(FOLLOWING_KEY, name);
}

// Subscribe state (cached locally, updated from API responses)
export function getSubscriptions(): string[] {
  return getList(SUBSCRIPTIONS_KEY);
}

export function isSubscribed(name: string): boolean {
  return getSubscriptions().includes(name);
}

export function setSubscribed(name: string, subscribed: boolean): void {
  if (subscribed) addToList(SUBSCRIPTIONS_KEY, name);
  else removeFromList(SUBSCRIPTIONS_KEY, name);
}

/** Extract follow status from an API agent/profile response if available. */
export function detectFollowStatus(data: MoltbookAgentResponse, agentName: string): void {
  const agent = data?.agent ?? data?.profile;
  const status = agent?.is_following ?? data?.is_following;
  if (typeof status === "boolean") {
    setFollowing(agentName, status);
  }
}

/** Extract subscribe status from an API submolt response if available. */
export function detectSubscribeStatus(data: MoltbookSubmoltResponse, submoltName: string): void {
  const submolt = data?.submolt;
  const status = submolt?.is_subscribed ?? data?.is_subscribed;
  if (typeof status === "boolean") {
    setSubscribed(submoltName, status);
  }
}
