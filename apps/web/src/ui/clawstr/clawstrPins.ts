type PinnedUser = {
  npub: string;
  name: string;
};

const PINNED_USERS_KEY = "moltpostor.clawstrPinnedUsers.v2";
const PINNED_SUBCLAWS_KEY = "moltpostor.clawstrPinnedSubclaws.v1";

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

function addToList(key: string, id: string): void {
  const list = getList(key).filter((n) => n !== id);
  list.unshift(id);
  setList(key, list);
}

function removeFromList(key: string, id: string): void {
  setList(key, getList(key).filter((n) => n !== id));
}

// Pinned users (by npub with name)
function getUserList(): PinnedUser[] {
  try {
    const raw = localStorage.getItem(PINNED_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setUserList(list: PinnedUser[]): void {
  try {
    localStorage.setItem(PINNED_USERS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

export function getClawstrPinnedUsers(): PinnedUser[] {
  return getUserList();
}

export function isClawstrUserPinned(npub: string): boolean {
  return getUserList().some((u) => u.npub === npub);
}

export function pinClawstrUser(npub: string, name: string): void {
  const list = getUserList().filter((u) => u.npub !== npub);
  list.unshift({ npub, name });
  setUserList(list);
}

export function unpinClawstrUser(npub: string): void {
  setUserList(getUserList().filter((u) => u.npub !== npub));
}

// Pinned subclaws
export function getClawstrPinnedSubclaws(): string[] {
  return getList(PINNED_SUBCLAWS_KEY);
}

export function isClawstrSubclawPinned(name: string): boolean {
  return getClawstrPinnedSubclaws().includes(name);
}

export function pinClawstrSubclaw(name: string): void {
  addToList(PINNED_SUBCLAWS_KEY, name);
}

export function unpinClawstrSubclaw(name: string): void {
  removeFromList(PINNED_SUBCLAWS_KEY, name);
}
