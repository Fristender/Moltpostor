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

## Testing Checklist

- [ ] Tab appears and switches correctly
- [ ] Login/API key import works
- [ ] Feed loads and displays posts
- [ ] Clicking post opens post view
- [ ] Clicking user opens profile
- [ ] Back/forward navigation works
- [ ] URL updates correctly on navigation
- [ ] Direct URL access works (paste URL, refresh)
- [ ] Saved items open correctly
- [ ] Watch history tracks views
- [ ] Caching works (view post, go offline, revisit)
- [ ] Platform switches correctly from Saved/History pages
- [ ] CSP doesn't block API requests
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without errors

## File Checklist

When adding a new platform, you'll typically modify these files:

1. `packages/core/src/index.ts` - Types
2. `packages/api/src/newplatform.ts` - API client (new file)
3. `packages/api/src/index.ts` - Export API
4. `apps/web/src/ui/useApiKeyStore.ts` - Platform type
5. `apps/web/src/ui/TabBar.tsx` - Tab
6. `apps/web/src/ui/App.tsx` - Routing, pages, API instance
7. `apps/web/src/ui/Header.tsx` - Navigation
8. `apps/web/src/ui/SavedPage.tsx` - Saved item links
9. `apps/web/src/ui/WatchHistoryPage.tsx` - History item links
10. `apps/web/src/ui/newplatform/*.tsx` - UI components (new files)
11. `apps/web/index.html` - CSP (if needed)
