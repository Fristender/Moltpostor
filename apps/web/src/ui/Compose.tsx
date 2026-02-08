import React, { useEffect, useRef, useState } from "react";
import { HttpError, type MoltbookApi } from "@moltpostor/api";
import type { MoltbookPostResponse } from "@moltpostor/core";
import { debugTextFromError, parseJsonBody } from "./errors";

function extractPostId(res: MoltbookPostResponse): string | null {
  const id = res?.post?.id ?? null;
  return id ? String(id) : null;
}

function postErrorReasons(status: number, hasSubmolt: boolean): string[] {
  switch (status) {
    case 400:
      return [
        "Title/content/URL fields are invalid.",
        ...(hasSubmolt ? ["Submolt name format is invalid."] : []),
      ];
    case 401:
    case 403:
      return ["Your API key is missing/invalid, or you don't have permission for this action."];
    case 404:
      return hasSubmolt ? ["The submolt doesn't exist."] : ["The resource doesn't exist."];
    case 429:
      return ["You are rate-limited. Wait and try again."];
    default:
      return [];
  }
}

function postErrorUserMessage(err: HttpError, submoltName: string | null): string {
  const body = parseJsonBody(err.bodyText);
  const serverError = typeof body?.error === "string" ? body.error : null;
  const hint = typeof body?.hint === "string" ? body.hint : null;
  const retryMinutes = typeof body?.retry_after_minutes === "number" ? body.retry_after_minutes : null;
  const retrySeconds = typeof body?.retry_after_seconds === "number" ? body.retry_after_seconds : null;

  if (err.status === 404 && submoltName) {
    return `Submolt "${submoltName}" doesn't exist (HTTP 404). Create it first or pick an existing submolt.`;
  }

  if (err.status === 429) {
    const wait =
      hint ??
      (retryMinutes !== null ? `Wait ${retryMinutes} minute(s) before posting again.` : null) ??
      (retrySeconds !== null ? `Wait ${retrySeconds} second(s) before posting again.` : null);
    return `You're rate-limited (HTTP 429).${wait ? ` ${wait}` : ""}`;
  }

  const reasons = postErrorReasons(err.status, !!submoltName);
  const reasonText = reasons.length ? `\nPossible reasons:\n${reasons.map((r) => `- ${r}`).join("\n")}` : "";
  const serverText = serverError ? `\nServer error: ${serverError}` : "";
  const hintText = hint ? `\nHint: ${hint}` : "";
  return `Failed to create post (HTTP ${err.status}).${serverText}${hintText}${reasonText}`;
}

export function Compose(props: { api: MoltbookApi; onCreated: (postId: string) => void; initialSubmolt?: string }) {
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

            const res = await props.api.createPost(payload);
            const postId = extractPostId(res);
            if (postId) props.onCreated(postId);
            else setError({ user: "Post created but no post id returned by API.", debug: JSON.stringify(res, null, 2) });
          } catch (e: unknown) {
            if (e instanceof HttpError) {
              setError({
                user: postErrorUserMessage(e, submolt.trim() || null),
                debug: debugTextFromError(e),
              });
              return;
            }
            setError({ user: "Failed to create post.", debug: debugTextFromError(e) });
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
