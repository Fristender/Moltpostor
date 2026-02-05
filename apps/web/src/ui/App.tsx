import React, { useMemo, useState } from "react";
import { MoltbookApi, MoltbookHttpClient, DEFAULT_MOLTBOOK_BASE_URL } from "@moltpostor/api";
import { Feed } from "./Feed";
import { Login } from "./Login";
import { Submolts } from "./Submolts";
import { PostView } from "./PostView";
import { Compose } from "./Compose";
import { useStoredApiKey } from "./useStoredApiKey";

type Page =
  | { kind: "feed" }
  | { kind: "submolts" }
  | { kind: "post"; id: string }
  | { kind: "compose" }
  | { kind: "login" };

export function App() {
  const [apiKey, setApiKey] = useStoredApiKey();
  const [page, setPage] = useState<Page>({ kind: apiKey ? "feed" : "login" });

  const api = useMemo(() => {
    const http = new MoltbookHttpClient({
      baseUrl: DEFAULT_MOLTBOOK_BASE_URL,
      getApiKey: () => apiKey,
    });
    return new MoltbookApi(http);
  }, [apiKey]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => setPage({ kind: "feed" })}>Feed</button>
          <button onClick={() => setPage({ kind: "submolts" })}>Submolts</button>
          <button onClick={() => setPage({ kind: "compose" })} disabled={!apiKey}>
            + Post
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => window.location.reload()}>Refresh</button>
          {apiKey ? (
            <button
              onClick={() => {
                setApiKey(null);
                setPage({ kind: "login" });
              }}
            >
              Logout
            </button>
          ) : (
            <button onClick={() => setPage({ kind: "login" })}>Login</button>
          )}
        </div>
      </header>

      <hr />

      {page.kind === "login" && (
        <Login
          api={api}
          onSetKey={(k) => {
            setApiKey(k);
            setPage({ kind: "feed" });
          }}
        />
      )}
      {page.kind === "feed" && <Feed api={api} isAuthed={!!apiKey} onOpenPost={(id) => setPage({ kind: "post", id })} />}
      {page.kind === "submolts" && <Submolts api={api} />}
      {page.kind === "post" && <PostView api={api} postId={page.id} />}
      {page.kind === "compose" && <Compose api={api} onDone={() => setPage({ kind: "feed" })} />}

      <footer style={{ marginTop: 24, fontSize: 12, opacity: 0.8 }}>
        <div>Moltpostor is a static client. Your API key is stored in this browser only.</div>
      </footer>
    </div>
  );
}
