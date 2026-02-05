import React, { useEffect, useRef, useState } from "react";
import { HttpError, type MoltbookApi } from "@moltpostor/api";

export function Compose(props: { api: MoltbookApi; onDone: () => void; initialSubmolt?: string }) {
  const [submolt, setSubmolt] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<{ user: string; debug?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const lastInitialRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const init = props.initialSubmolt?.trim();
    if (!init) return;
    // Only overwrite the field when navigating into compose with a new prefill.
    if (lastInitialRef.current !== init) {
      setSubmolt(init);
      lastInitialRef.current = init;
    }
  }, [props.initialSubmolt]);

  return (
    <section>
      <h2>Create post</h2>
      {error && (
        <div style={{ color: "crimson" }}>
          <div>{error.user}</div>
          {error.debug && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer" }}>Debug details</summary>
              <pre style={{ whiteSpace: "pre-wrap" }}>{error.debug}</pre>
            </details>
          )}
        </div>
      )}
      <label>
        Submolt (optional)
        <input value={submolt} onChange={(e) => setSubmolt(e.target.value)} placeholder="submolt-name" style={{ width: "100%" }} />
      </label>
      <label>
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" style={{ width: "100%" }} />
      </label>
      <label>
        URL (optional)
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={{ width: "100%" }} />
      </label>
      <label>
        Content (optional)
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} style={{ width: "100%" }} />
      </label>
      <button
        onClick={async () => {
          setError(null);
          const t = title.trim();
          if (!t) return;
          setBusy(true);
          try {
            const payload: { title: string; submolt?: string; url?: string; content?: string } = { title: t };
            const sm = submolt.trim();
            const u = url.trim();
            const c = content.trim();
            if (sm) payload.submolt = sm;
            if (u) payload.url = u;
            if (c) payload.content = c;

            await props.api.createPost(payload);
            props.onDone();
          } catch (e: any) {
            if (e instanceof HttpError) {
              // Common case: posting to a submolt that doesn't exist.
              if (e.status === 404 && submolt.trim()) {
                setError({
                  user: `Submolt "${submolt.trim()}" doesn't exist (HTTP 404). Create it first or pick an existing submolt.`,
                  debug: `HttpError: ${e.message}\nstatus=${e.status}\nbody=${e.bodyText || "(empty body)"}`,
                });
                return;
              }
              setError({
                user: `Failed to create post (HTTP ${e.status}).`,
                debug: `HttpError: ${e.message}\nstatus=${e.status}\nbody=${e.bodyText || "(empty body)"}`,
              });
              return;
            }
            setError({ user: "Failed to create post.", debug: e?.message ?? String(e) });
          } finally {
            setBusy(false);
          }
        }}
        disabled={busy || !title.trim()}
      >
        Post
      </button>
    </section>
  );
}
