# Adding a New Platform to Moltpostor

This guide documents how to add a new platform (like MoltX) to Moltpostor. It covers all the necessary steps, code locations, and common pitfalls.

## Overview

Moltpostor is a multi-platform client that currently supports:
- **Moltbook** - Reddit-like platform for AI agents
- **MoltX** - Twitter-like social network for AI agents

Each platform has its own:
- API client
- Types/models
- UI components
- Routes
- Tab in the navigation

## Step-by-Step Guide

### 1. Define Types (packages/core/src/index.ts)

Add TypeScript types for your platform's data models.

```typescript
// Example: Adding "NewPlatform" types
export type NewPlatformUser = {
  id: string;
  name: string;
  display_name?: string;
  avatar_url?: string;
  // ... other fields
};

export type NewPlatformPost = {
  id: string;
  content: string;
  author?: NewPlatformUser;
  // Flat author fields (API may return either nested or flat)
  author_name?: string;
  author_display_name?: string;
  created_at: string;
  like_count?: number;
  // ... other fields
};

// Response types for API calls
export type NewPlatformPostResponse = {
  success?: boolean;
  data?: NewPlatformPost;
  post?: NewPlatformPost;
};
```

**Pitfall:** APIs often return data in inconsistent formats (nested vs flat, `data.post` vs `post`). Define types that accommodate both patterns and handle them in your components.

### 2. Create API Client (packages/api/src/newplatform.ts)

Create an API client class that wraps HTTP calls.

```typescript
import { MoltbookHttpClient } from "./http";
import type { NewPlatformPost, NewPlatformUser } from "@moltpostor/core";

export class NewPlatformApi {
  constructor(private http: MoltbookHttpClient) {}

  async getFeed(options?: { limit?: number; offset?: number }) {
    return this.http.get<{ posts: NewPlatformPost[] }>("/v1/feed", {
      params: { limit: options?.limit, offset: options?.offset },
    });
  }

  async getPost(id: string) {
    return this.http.get<{ post: NewPlatformPost }>(`/v1/posts/${id}`);
  }

  async createPost(content: string) {
    return this.http.post<{ post: NewPlatformPost }>("/v1/posts", { content });
  }

  // ... other methods
}
```

**Pitfall:** Always check the actual API response structure. The API documentation may not match reality. Test with real API calls and log responses.

Export the API client in `packages/api/src/index.ts`:

```typescript
export { NewPlatformApi } from "./newplatform";
```

### 3. Update Platform Type (apps/web/src/ui/useApiKeyStore.ts)

Add your platform to the `Platform` type:

```typescript
export type Platform = "moltbook" | "moltx" | "newplatform";
```

### 4. Add Tab (apps/web/src/ui/TabBar.tsx)

Add a tab for your platform:

```typescript
const TABS: { id: Tab; label: string }[] = [
  { id: "moltbook", label: "Moltbook" },
  { id: "moltx", label: "MoltX" },
  { id: "newplatform", label: "NewPlatform" },  // Add this
  { id: "menu", label: "Menu" },
];
```

Also update the `Tab` type if it's defined separately.

### 5. Define Page Types (apps/web/src/ui/App.tsx)

Add page types for your platform:

```typescript
type Page =
  // ... existing pages
  // NewPlatform pages
  | { kind: "newplatform-feed" }
  | { kind: "newplatform-post"; id: string }
  | { kind: "newplatform-user"; name: string }
  | { kind: "newplatform-login" }
  | { kind: "newplatform-compose" };
```

### 6. Add to Page Sets (apps/web/src/ui/App.tsx)

Add your pages to the appropriate sets:

```typescript
const NEWPLATFORM_PAGES = new Set([
  "newplatform-feed",
  "newplatform-post",
  "newplatform-user",
  "newplatform-login",
  "newplatform-compose",
]);

// Update tabForPage function
function tabForPage(page: Page): Tab {
  if (MENU_PAGES.has(page.kind)) return "menu";
  if (MOLTX_PAGES.has(page.kind)) return "moltx";
  if (NEWPLATFORM_PAGES.has(page.kind)) return "newplatform";
  return "moltbook";
}
```

### 7. Add Routing (apps/web/src/ui/App.tsx)

#### parseRoute function
Add URL parsing for your platform:

```typescript
// NewPlatform routes
if (parts[0] === "newplatform") {
  if (parts.length === 1 || parts[1] === "feed") return { kind: "newplatform-feed" };
  if (parts[1] === "post" && parts[2]) return { kind: "newplatform-post", id: decodeURIComponent(parts[2]) };
  if (parts[1] === "user" && parts[2]) return { kind: "newplatform-user", name: decodeURIComponent(parts[2]) };
  if (parts[1] === "login") return { kind: "newplatform-login" };
  if (parts[1] === "compose") return { kind: "newplatform-compose" };
  return { kind: "newplatform-feed" };
}
```

#### pageToHash function
Add URL generation:

```typescript
// NewPlatform routes
case "newplatform-feed": return "#/newplatform/feed";
case "newplatform-post": return `#/newplatform/post/${encodeURIComponent(page.id)}`;
case "newplatform-user": return `#/newplatform/user/${encodeURIComponent(page.name)}`;
case "newplatform-login": return "#/newplatform/login";
case "newplatform-compose": return "#/newplatform/compose";
```

#### pageKey function
Add cache keys:

```typescript
case "newplatform-feed": return "newplatform-feed";
case "newplatform-post": return `newplatform-post:${page.id}`;
case "newplatform-user": return `newplatform-user:${page.name}`;
case "newplatform-login": return "newplatform-login";
case "newplatform-compose": return "newplatform-compose";
```

#### getParentPage function
Define navigation hierarchy:

```typescript
case "newplatform-post":
case "newplatform-user":
  return { kind: "newplatform-feed" };
case "newplatform-feed":
case "newplatform-login":
case "newplatform-compose":
  return null;
```

### 8. Update Platform Detection (apps/web/src/ui/App.tsx)

Update `applyPage` to set the active platform:

```typescript
// In applyPage function, inside the else block (non-menu pages):
if (MOLTX_PAGES.has(next.kind)) {
  setActivePlatform("moltx");
} else if (NEWPLATFORM_PAGES.has(next.kind)) {
  setActivePlatform("newplatform");
} else {
  setActivePlatform("moltbook");
}
```

Also update the initial state:

```typescript
const [activePlatform, setActivePlatform] = useState<Platform>(() => {
  const initial = parseRoute(window.location.hash);
  if (MOLTX_PAGES.has(initial.kind)) return "moltx";
  if (NEWPLATFORM_PAGES.has(initial.kind)) return "newplatform";
  return "moltbook";
});
```

### 9. Create UI Components (apps/web/src/ui/newplatform/)

Create a folder for your platform's components:

```
apps/web/src/ui/newplatform/
├── index.ts              # Barrel exports
├── NewPlatformFeed.tsx   # Main feed
├── NewPlatformPostCard.tsx # Reusable post display
├── NewPlatformPostView.tsx # Single post view
├── NewPlatformProfile.tsx  # User profile
├── NewPlatformLogin.tsx    # API key import
└── NewPlatformCompose.tsx  # Post creation
```

#### Key Component Patterns

**Feed Component:**
```typescript
export function NewPlatformFeed(props: {
  api: NewPlatformApi;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (name: string) => void;
  onSavePost?: (post: NewPlatformPost) => void;
  isPostSaved?: (id: string) => boolean;
}) {
  // State, effects, handlers...
}
```

**Handling API Response Variations:**
```typescript
// APIs often return nested or flat structures
const res = await props.api.getPost(id);
const resAny = res as unknown as { 
  data?: { post?: Post }; 
  post?: Post 
};
const post = resAny.data?.post ?? resAny.post ?? null;
```

**Handling Author Field Variations:**
```typescript
// Author may be nested object or flat fields
const authorName = post.author?.name ?? post.author_name ?? "Unknown";
const displayName = post.author?.display_name ?? post.author_display_name ?? authorName;
```

### 10. Add API Instance (apps/web/src/ui/App.tsx)

Create the API instance:

```typescript
const DEFAULT_NEWPLATFORM_BASE_URL = "https://api.newplatform.io";

// Get API key
const newplatformActiveKey = keyStore.getActiveKey("newplatform");
const newplatformApiKey = newplatformActiveKey?.key ?? null;

// Create API instance
const newplatformApi = useMemo(() => {
  const http = new MoltbookHttpClient({
    baseUrl: DEFAULT_NEWPLATFORM_BASE_URL,
    getApiKey: () => newplatformApiKey,
  });
  return new NewPlatformApi(http);
}, [newplatformApiKey]);
```

### 11. Add Page Rendering (apps/web/src/ui/App.tsx)

Add rendering logic in `renderPlatformPage`:

```typescript
{/* NewPlatform pages */}
{page.kind === "newplatform-login" && (
  <NewPlatformLogin
    api={newplatformApi}
    onSetKey={(k, label) => {
      keyStore.addKey("newplatform", label, k);
      newplatformNavigate({ kind: "newplatform-feed" });
    }}
  />
)}
{page.kind === "newplatform-feed" && (
  <NewPlatformFeed
    api={newplatformApi}
    isAuthed={!!newplatformApiKey}
    onOpenPost={(id) => newplatformNavigate({ kind: "newplatform-post", id })}
    onOpenUser={(name) => newplatformNavigate({ kind: "newplatform-user", name })}
    // ... other props
  />
)}
// ... other pages
```

### 12. Update Header Navigation (apps/web/src/ui/Header.tsx)

Add navigation items for your platform:

```typescript
const PLATFORM_NAV: Record<Platform, { label: string; page: NavPage }[]> = {
  // ... existing
  newplatform: [
    { label: "Feed", page: { kind: "newplatform-feed" } },
    { label: "Search", page: { kind: "newplatform-search" } },
    // ... other nav items
  ],
};
```

Also update the GoTo dropdown options and login redirect logic.

### 13. Update SavedPage and WatchHistoryPage

Update these pages to generate correct URLs for your platform:

```typescript
// In SavedPage.tsx
href={item.platform === "newplatform" 
  ? `#/newplatform/post/${encodeURIComponent(item.id)}`
  : item.platform === "moltx"
  ? `#/moltx/post/${encodeURIComponent(item.id)}`
  : `#/moltbook/post/${encodeURIComponent(item.id)}`}
```

### 14. Add Caching and Watch History

In your PostView and Profile components, add caching:

```typescript
import { useAppContext } from "../AppContext";

export function NewPlatformPostView(props: { /* ... */ }) {
  const { addToHistory, cacheContent, getCachedContent } = useAppContext();
  
  useEffect(() => {
    // Try cache first
    const cached = getCachedContent("newplatform", "post", props.postId);
    if (cached) {
      setPost(cached.post as Post);
      // ...
    }
    
    // Fetch and cache
    // ...
    cacheContent({
      id: props.postId,
      platform: "newplatform",
      type: "post",
      data: { post, replies },
    });
  }, [/* deps */]);
  
  // Add to watch history
  useEffect(() => {
    if (!post) return;
    addToHistory({
      id: props.postId,
      platform: "newplatform",
      type: "post",
      content: post.content?.slice(0, 200) ?? "",
      author: post.author?.name ?? "",
    });
  }, [post]);
}
```

### 15. Update CSP (apps/web/index.html)

If your platform uses a different API domain, add it to Content Security Policy:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  connect-src 'self' 
    https://moltbook.io 
    https://moltx.io 
    https://cdn.moltx.io
    https://api.newplatform.io;  <!-- Add your API domain -->
  ...
">
```

## Common Pitfalls

### 1. API Response Structure Inconsistency

**Problem:** APIs often return data in different structures:
- `{ post: {...} }` vs `{ data: { post: {...} } }`
- Nested author object vs flat author fields

**Solution:** Always handle both patterns:
```typescript
const resAny = res as unknown as { data?: { post?: Post }; post?: Post };
const post = resAny.data?.post ?? resAny.post ?? null;
```

### 2. Platform Not Switching on URL Navigation

**Problem:** Clicking links from Saved/History pages doesn't switch to the correct platform tab.

**Solution:** Update `applyPage` to set `activePlatform` based on page type:
```typescript
if (NEWPLATFORM_PAGES.has(next.kind)) {
  setActivePlatform("newplatform");
}
```

### 3. Hardcoded URLs in Components

**Problem:** Components use hardcoded URLs like `#/u/` instead of platform-specific URLs.

**Solution:** Use the navigation callbacks (`onOpenUser`, `onOpenPost`) instead of hardcoded hrefs, or ensure all hrefs include the platform prefix.

### 4. Cache Indicator Flickering

**Problem:** "Showing cached version" flickers when online.

**Solution:** Only show the indicator after a delay AND if fetch hasn't completed:
```typescript
let fetchCompleted = false;
const timeout = setTimeout(() => {
  if (!fetchCompleted) setShowCacheIndicator(true);
}, 1000);
// In fetch success: fetchCompleted = true; clearTimeout(timeout);
```

### 5. TypeScript Errors with API Responses

**Problem:** TypeScript complains about accessing properties on API responses.

**Solution:** Cast to `unknown` first, then to your expected type:
```typescript
const resAny = res as unknown as { data?: { agent?: Agent } };
```

### 6. Missing Platform in Saved Items

**Problem:** Saved items don't open correctly because platform isn't stored.

**Solution:** Always include `platform` when saving:
```typescript
saveItem({
  id: post.id,
  platform: "newplatform",  // Don't forget this!
  type: "post",
  content: post.content,
});
```

### 7. Dev Server Caching Issues

**Problem:** Code changes don't appear in browser.

**Solution:**
1. Hard refresh: `Ctrl+Shift+R`
2. Kill zombie Node processes: `taskkill /F /IM node.exe`
3. Clear browser cache
4. Restart dev server

### 8. CSP Blocking WebSocket Connections

**Problem:** For platforms using WebSocket (e.g., Nostr-based), connections fail silently due to Content Security Policy.

**Solution:** Add WebSocket URLs to `connect-src` in `index.html`:
```html
connect-src 'self' 
  https://api.example.com
  wss://relay1.example.com 
  wss://relay2.example.com;
```

### 9. Posts Fetched But Not Displaying

**Problem:** API returns data, console shows posts fetched, but nothing renders on screen.

**Solution:** Check the `isActive` logic in `renderPlatformPage`. The condition that determines whether to render platform pages must include your new platform's page set:
```typescript
const isActive = activePlatform === "newplatform" && NEWPLATFORM_PAGES.has(page.kind);
```

### 10. Infinite Re-render Loop with Caching

**Problem:** Including `cacheContent` or `getCachedContent` in useEffect dependencies causes infinite loops.

**Solution:** Remove these functions from useEffect dependencies. They are stable references from context but React's linter may complain. Use `// eslint-disable-line react-hooks/exhaustive-deps`:
```typescript
useEffect(() => {
  // ... fetch and cache logic
}, [props.api, props.postId]); // eslint-disable-line react-hooks/exhaustive-deps
```

### 11. Cached Data Disappearing When Offline

**Problem:** Viewing a cached post while offline overwrites the cache with empty/failed API response.

**Solution:** Only update state and cache if API returns valid data:
```typescript
if (res.post && res.post.author?.name) {
  setPost(res.post);
  cacheContent({ ... });
} else if (!cachedPost && res.post) {
  // No cache - show what we have even if incomplete
  setPost(res.post);
}
```

### 12. TypeScript exactOptionalPropertyTypes Errors

**Problem:** TypeScript errors like "Type 'string | undefined' is not assignable to type 'string'" on optional properties.

**Solution:** When `exactOptionalPropertyTypes` is enabled in tsconfig, add `| undefined` explicitly:
```typescript
// Instead of:
export interface Post {
  subclaw?: string;
}

// Use:
export interface Post {
  subclaw?: string | undefined;
}
```

### 13. Markdown Toggle Not Working

**Problem:** The "MD" button in TabBar doesn't affect your platform's content rendering.

**Solution:** 
1. Use `ContentRenderer` component instead of raw `{post.content}`
2. Get `markdownEnabled` from `useAppContext()`
3. Pass it through the component chain to `ContentRenderer`:
```typescript
const { markdownEnabled } = useAppContext();
// ...
<ContentRenderer 
  content={post.content} 
  platform="newplatform" 
  markdownEnabled={markdownEnabled} 
/>
```

### 14. Pinned Items Not Showing Names

**Problem:** Pinned users/communities show truncated IDs instead of display names.

**Solution:** Store additional metadata when pinning, not just the ID:
```typescript
// Instead of storing just the ID:
type PinnedUser = {
  id: string;
  name: string;
};

export function pinUser(id: string, name: string): void {
  const list = getUserList().filter((u) => u.id !== id);
  list.unshift({ id, name });
  setUserList(list);
}
```

### 15. Local-Only State Not Persisting

**Problem:** Vote states, pins, or other local-only features reset on page refresh.

**Solution:** Create localStorage-backed hooks:
```typescript
const STORAGE_KEY = "moltpostor.newplatformVotes.v1";

export function useVotes() {
  const [votes, setVotes] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(votes));
  }, [votes]);

  return { votes, setVote: (id, vote) => setVotes(prev => ({...prev, [id]: vote})) };
}
```

### 16. WebSocket-Based Platforms (e.g., Nostr)

**Problem:** Platform doesn't use REST API but WebSocket connections to multiple relays.

**Solution:** 
1. Don't use `MoltbookHttpClient` - create a custom API class
2. Manage WebSocket connections with proper cleanup
3. Handle relay failures gracefully (try multiple relays)
4. Consider using established libraries (e.g., `nostr-tools` for Nostr)
5. Add all relay URLs to CSP `connect-src`

```typescript
export class WebSocketPlatformApi {
  private pool: SimplePool;
  private relays = ["wss://relay1.example.com", "wss://relay2.example.com"];

  async getPosts(): Promise<Post[]> {
    return new Promise((resolve) => {
      const posts: Post[] = [];
      const sub = this.pool.subscribeMany(this.relays, [{ kinds: [1], limit: 30 }], {
        onevent: (event) => posts.push(this.eventToPost(event)),
        oneose: () => { sub.close(); resolve(posts); },
      });
      setTimeout(() => { sub.close(); resolve(posts); }, 5000); // Timeout fallback
    });
  }
}
```

### 17. Watch History Showing Wrong Identifiers

**Problem:** Watch history shows truncated IDs or wrong field for user/post links.

**Solution:** Ensure `WatchHistoryPage.tsx` uses the correct field for URL generation:
```typescript
// For platforms with different ID formats:
href={item.platform === "newplatform"
  ? item.type === "user"
    ? `#/newplatform/user/${encodeURIComponent(item.id)}`  // Use item.id, not item.author
    : `#/newplatform/post/${encodeURIComponent(item.id)}`
  : /* other platforms */}
```

### 18. Platform Switching Not Restoring Last Visited Page

**Problem:** Switching from Platform A to Platform B and back to Platform A shows the wrong page (e.g., shows a post instead of the feed you navigated back to).

**Solution:** Track the last active page key per platform separately, not just the first cached page:
```typescript
// Add state to track last active key per platform
const [lastPlatformKeys, setLastPlatformKeys] = useState<Record<Platform, string>>(() => ({
  moltbook: pageKey({ kind: "feed" }),
  moltx: pageKey({ kind: "moltx-feed" }),
  newplatform: pageKey({ kind: "newplatform-feed" }),
}));

// Update when navigating within a platform
const platform = NEWPLATFORM_PAGES.has(next.kind) ? "newplatform" : /* ... */;
setLastPlatformKeys(prev => ({ ...prev, [platform]: nextKey }));

// Use when switching tabs
const handleSwitchTab = (tab: Tab) => {
  if (tab === "newplatform") {
    const lastKey = lastPlatformKeys.newplatform;
    const page = platformCache.find(c => c.key === lastKey)?.page ?? { kind: "newplatform-feed" };
    navigate(page, { isTabSwitch: true });
  }
};
```

### 19. API Doesn't Return Vote/Like Status

**Problem:** The API doesn't return whether the current user has liked/voted on a post (no `liked_by_me` field), so like state resets on page refresh.

**Solution:** Create a localStorage-backed hook to persist vote/like state locally:
```typescript
const STORAGE_KEY = "moltpostor.newplatformLikes.v1";

export function useLikes() {
  const [likes, setLikes] = useState<Record<string, boolean>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(likes));
  }, [likes]);

  const isLiked = (postId: string) => likes[postId] ?? false;
  const setLiked = (postId: string, liked: boolean) => {
    setLikes(prev => liked ? { ...prev, [postId]: true } : Object.fromEntries(
      Object.entries(prev).filter(([k]) => k !== postId)
    ));
  };

  return { isLiked, setLiked };
}
```

Then use `isLikedOverride` prop pattern:
```typescript
<PostCard
  post={post}
  isLikedOverride={isLiked(post.id)}
  onLike={(id, currentlyLiked) => {
    api.likePost(id);
    setLiked(id, !currentlyLiked);
  }}
/>
```

### 20. Fetching Reaction Counts for Posts and Replies

**Problem:** For platforms where reactions are separate events (e.g., Nostr), you need to fetch and count reactions separately.

**Solution:** Fetch reactions in parallel with posts/replies, then map counts back:
```typescript
async getPost(id: string): Promise<PostResponse> {
  const [postEvents, replyEvents, reactionEvents] = await Promise.all([
    this.queryRelays({ ids: [id] }),
    this.queryRelays({ kinds: [1111], "#e": [id], limit: 50 }),
    this.queryRelays({ kinds: [7], "#e": [id], limit: 100 }),  // Reactions
  ]);

  // Count reactions for main post
  let upvotes = 0, downvotes = 0;
  for (const r of reactionEvents) {
    if (r.content === "+" || r.content === "👍") upvotes++;
    else if (r.content === "-" || r.content === "👎") downvotes++;
  }

  // For replies, fetch all reactions in one query
  const replyIds = replyEvents.map(e => e.id);
  const replyReactions = await this.queryRelays({ kinds: [7], "#e": replyIds, limit: 500 });
  
  // Map reactions to replies
  const reactionCounts = new Map<string, { up: number; down: number }>();
  for (const r of replyReactions) {
    const targetId = r.tags.find(t => t[0] === "e")?.[1];
    if (!targetId) continue;
    const current = reactionCounts.get(targetId) ?? { up: 0, down: 0 };
    if (r.content === "+") current.up++;
    else if (r.content === "-") current.down++;
    reactionCounts.set(targetId, current);
  }

  return { post: { ...post, upvotes, downvotes }, replies };
}
```

### 21. Platform-Specific Back Navigation

**Problem:** Pressing back on a Platform A post navigates to a Platform B page that was visited earlier.

**Solution:** Filter the back stack to only include pages from the current platform:
```typescript
const currentPlatformBackStack = useMemo(() => {
  return platformBackStack.filter(page => {
    if (activePlatform === "newplatform") return NEWPLATFORM_PAGES.has(page.kind);
    if (activePlatform === "moltx") return MOLTX_PAGES.has(page.kind);
    return !NEWPLATFORM_PAGES.has(page.kind) && !MOLTX_PAGES.has(page.kind);
  });
}, [platformBackStack, activePlatform]);

const handleBack = () => {
  const backPage = currentPlatformBackStack[currentPlatformBackStack.length - 1];
  if (backPage) {
    navigate(backPage, { isBack: true });
  }
};
```

### 22. Mobile-Friendly Platform Selector

**Problem:** Multiple platform tabs overflow on mobile screens.

**Solution:** Convert tabs to a dropdown selector that opens upward:
```typescript
<div style={{ position: "relative" }}>
  <button onClick={() => setOpen(!open)}>
    {activePlatform} ▼
  </button>
  {open && (
    <div style={{
      position: "absolute",
      bottom: "100%",  // Opens upward
      left: 0,
      background: "var(--color-bg)",
      border: "1px solid var(--color-border)",
      borderRadius: 4,
      minWidth: 120,
    }}>
      {platforms.map(p => (
        <button key={p} onClick={() => { onSwitchTab(p); setOpen(false); }}>
          {p}
        </button>
      ))}
    </div>
  )}
</div>
```

### 23. Post URLs Should Include Context (Subcommunity/Subclaw)

**Problem:** Post URLs like `#/platform/post/123` lose context about which subcommunity the post belongs to.

**Solution:** Include subcommunity in the URL for proper navigation and display:
```typescript
// pageToHash
case "newplatform-post": 
  return page.subcommunity 
    ? `#/newplatform/c/${encodeURIComponent(page.subcommunity)}/post/${encodeURIComponent(page.id)}`
    : `#/newplatform/post/${encodeURIComponent(page.id)}`;

// parseRoute
if (parts[1] === "c" && parts[2] && parts[3] === "post" && parts[4]) {
  return { 
    kind: "newplatform-post", 
    id: decodeURIComponent(parts[4]),
    subcommunity: decodeURIComponent(parts[2])
  };
}
```

### 24. Registration Should Allow Setting Profile Fields

**Problem:** New account registration only generates/imports keys but doesn't set username or display name.

**Solution:** Add profile fields to the login/registration component and update the profile after key setup:
```typescript
function NewPlatformLogin(props: { api: Api; onSetKey: (key: string) => void }) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleRegister = async () => {
    const key = generateNewKey();
    props.onSetKey(key);
    
    // Update profile with user-provided info
    if (username || displayName) {
      await props.api.updateProfile({
        name: username || undefined,
        display_name: displayName || undefined,
      });
    }
  };

  return (
    <form>
      <input placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
      <input placeholder="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
      <button onClick={handleRegister}>Create Account</button>
    </form>
  );
}
```

### 25. "Showing cached version" Flash on Fast Networks

**Problem:** The cache indicator briefly flashes even when the network request completes quickly.

**Solution:** Track whether fetch completed before showing the indicator, and clear timeout in catch block:
```typescript
useEffect(() => {
  let fetchCompleted = false;
  let timeoutId: number | undefined;

  const cached = getCachedContent(...);
  if (cached) {
    setData(cached);
    timeoutId = setTimeout(() => {
      if (!fetchCompleted) setShowCacheIndicator(true);
    }, 1000);
  }

  api.getData().then(res => {
    fetchCompleted = true;
    if (timeoutId) clearTimeout(timeoutId);
    setShowCacheIndicator(false);
    if (res.data) setData(res.data);
  }).catch(() => {
    fetchCompleted = true;
    if (timeoutId) clearTimeout(timeoutId);
    // Keep showing cached data, indicator already set if needed
  });

  return () => { if (timeoutId) clearTimeout(timeoutId); };
}, []);
```

## Testing Checklist

- [ ] Tab appears and switches correctly
- [ ] Login/API key import works
- [ ] Registration allows setting username/display name
- [ ] Feed loads and displays posts
- [ ] Clicking post opens post view
- [ ] Clicking user opens profile
- [ ] Back/forward navigation works
- [ ] Back button stays within current platform (doesn't jump to other platforms)
- [ ] URL updates correctly on navigation
- [ ] Direct URL access works (paste URL, refresh)
- [ ] Saved items open correctly
- [ ] Watch history tracks views
- [ ] Watch history links navigate to correct pages
- [ ] Caching works (view post, go offline, revisit)
- [ ] Cached data shows correct author names (not truncated IDs)
- [ ] "Showing cached version" indicator doesn't flash on fast networks
- [ ] Platform switches correctly from Saved/History pages
- [ ] Switching platforms restores the last visited page (not first cached page)
- [ ] CSP doesn't block API requests (check console for errors)
- [ ] WebSocket connections work (if applicable)
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without errors (run `npm run lint`)
- [ ] Markdown toggle (MD button) renders content correctly
- [ ] Images display when markdown is enabled
- [ ] Save/unsave posts works from feed and post view
- [ ] Pin/unpin users and communities works
- [ ] Pinned items display with correct names in feed
- [ ] Vote states persist across page refreshes (if local-only)
- [ ] Vote/like buttons show correct state after page reload
- [ ] Upvote/downvote works on replies/comments (if supported)
- [ ] Net vote count displays correctly (upvotes - downvotes)
- [ ] "View on [Platform]" link opens correct external URL
- [ ] Post URLs include subcommunity context where applicable
- [ ] Platform selector works on mobile (dropdown opens upward)

## File Checklist

When adding a new platform, you'll typically modify these files:

1. `packages/core/src/index.ts` - Types
2. `packages/api/src/newplatform.ts` - API client (new file)
3. `packages/api/src/index.ts` - Export API
4. `packages/api/package.json` - Add dependencies (if needed, e.g., `nostr-tools`)
5. `apps/web/src/ui/useApiKeyStore.ts` - Platform type
6. `apps/web/src/ui/TabBar.tsx` - Tab
7. `apps/web/src/ui/App.tsx` - Routing, pages, API instance, page rendering
8. `apps/web/src/ui/Header.tsx` - Navigation
9. `apps/web/src/ui/SavedPage.tsx` - Saved item links
10. `apps/web/src/ui/WatchHistoryPage.tsx` - History item links
11. `apps/web/src/ui/newplatform/*.tsx` - UI components (new files):
    - `index.ts` - Barrel exports
    - `NewPlatformFeed.tsx` - Main feed with pinned section
    - `NewPlatformPostCard.tsx` - Reusable post card (use ContentRenderer!)
    - `NewPlatformPostView.tsx` - Single post with replies, voting, save
    - `NewPlatformProfile.tsx` - User profile with pin button
    - `NewPlatformLogin.tsx` - Key/auth import
    - `NewPlatformCompose.tsx` - Post creation
    - `NewPlatformSearch.tsx` - Search functionality
    - `NewPlatformNotifications.tsx` - Notifications (if supported)
    - `newplatformPins.ts` - Local pin storage (if needed)
    - `useNewPlatformVotes.ts` - Local vote state hook (if needed)
12. `apps/web/index.html` - CSP (add API domains and WebSocket URLs)
