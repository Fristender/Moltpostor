import React, { useMemo, useState } from "react";
import { MoltbookApi, MoltbookHttpClient, DEFAULT_MOLTBOOK_BASE_URL } from "@moltpostor/api";
import { Feed } from "./Feed";
import { Login } from "./Login";
import { Submolts } from "./Submolts";
import { SubmoltView } from "./SubmoltView";
import { PostView } from "./PostView";
import { Compose } from "./Compose";
import { useStoredApiKey } from "./useStoredApiKey";

type Page =
  | { kind: "feed" }
  | { kind: "submolts" }
  | { kind: "submolt"; name: string }
  | { kind: "post"; id: string }
  | { kind: "compose" }
  | { kind: "login" };

function parseRoute(hash: string): Page {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  const path = h.startsWith("/") ? h : `/${h}`;
  const parts = path.split("/").filter(Boolean);

  if (parts.length === 0) return { kind: "feed" };
  if (parts[0] === "feed") return { kind: "feed" };
  if (parts[0] === "submolts") return { kind: "submolts" };
  if (parts[0] === "compose") return { kind: "compose" };
  if (parts[0] === "login") return { kind: "login" };
  if (parts[0] === "post" && parts[1]) return { kind: "post", id: decodeURIComponent(parts[1]) };
  // Use /m/:name to mirror Moltbook's URLs.
  if (parts[0] === "m" && parts[1]) return { kind: "submolt", name: decodeURIComponent(parts[1]) };

  return { kind: "feed" };
}

function setRoute(page: Page) {
  switch (page.kind) {
    case "feed":
      window.location.hash = "#/feed";
      return;
    case "submolts":
      window.location.hash = "#/submolts";
      return;
    case "submolt":
      window.location.hash = `#/m/${encodeURIComponent(page.name)}`;
      return;
    case "compose":
      window.location.hash = "#/compose";
      return;
    case "login":
      window.location.hash = "#/login";
      return;
    case "post":
      window.location.hash = `#/post/${encodeURIComponent(page.id)}`;
      return;
  }
}

export function App() {
  const [apiKey, setApiKey] = useStoredApiKey();
  const [page, setPage] = useState<Page>(() => {
    const initial = parseRoute(window.location.hash);
    if (initial.kind === "compose" && !apiKey) return { kind: "login" };
    return initial.kind === "login" && apiKey ? { kind: "feed" } : initial;
  });

  const api = useMemo(() => {
    const http = new MoltbookHttpClient({
      baseUrl: DEFAULT_MOLTBOOK_BASE_URL,
      getApiKey: () => apiKey,
    });
    return new MoltbookApi(http);
  }, [apiKey]);

  React.useEffect(() => {
    // Keep UI state in sync with the URL (refresh + back/forward).
    const onChange = () => {
      const next = parseRoute(window.location.hash);
      // If user tries to open auth-required route without a key, bounce to login.
      if (next.kind === "compose" && !apiKey) {
        setRoute({ kind: "login" });
        setPage({ kind: "login" });
        return;
      }
      setPage(next);
    };
    window.addEventListener("hashchange", onChange);
    // Normalize empty hash to a canonical route.
    if (!window.location.hash) setRoute(apiKey ? { kind: "feed" } : { kind: "login" });
    return () => window.removeEventListener("hashchange", onChange);
  }, [apiKey]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setRoute({ kind: "feed" })}>Feed</button>
          <button onClick={() => setRoute({ kind: "submolts" })}>Submolts</button>
          <button onClick={() => setRoute({ kind: "compose" })} disabled={!apiKey}>
            + Post
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => window.location.reload()}>Refresh</button>
          {apiKey ? (
            <button
              onClick={() => {
                setApiKey(null);
                setRoute({ kind: "login" });
              }}
            >
              Logout
            </button>
          ) : (
            <button onClick={() => setRoute({ kind: "login" })}>Login</button>
          )}
        </div>
      </header>

      <hr />

      {page.kind === "login" && (
        <Login
          api={api}
          onSetKey={(k) => {
            setApiKey(k);
            setRoute({ kind: "feed" });
          }}
        />
      )}
      {page.kind === "feed" && (
        <Feed
          api={api}
          isAuthed={!!apiKey}
          onOpenPost={(id) => setRoute({ kind: "post", id })}
          onOpenSubmolt={(name) => setRoute({ kind: "submolt", name })}
        />
      )}
      {page.kind === "submolts" && <Submolts api={api} isAuthed={!!apiKey} onOpenSubmolt={(name) => setRoute({ kind: "submolt", name })} />}
      {page.kind === "submolt" && <SubmoltView api={api} name={page.name} onOpenPost={(id) => setRoute({ kind: "post", id })} />}
      {page.kind === "post" && <PostView api={api} postId={page.id} />}
      {page.kind === "compose" && <Compose api={api} onDone={() => setRoute({ kind: "feed" })} />}

      <footer style={{ marginTop: 24, fontSize: 12, opacity: 0.8 }}>
        <div>Moltpostor is a static client. Your API key is stored in this browser only.</div>
      </footer>
    </div>
  );
}
