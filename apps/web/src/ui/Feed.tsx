import React, { useEffect, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";
import type { MoltbookPost, MoltbookFeedResponse } from "@moltpostor/core";
import { getPinnedAgents, getPinnedSubmolts } from "./pins";

function normalizePosts(data: MoltbookFeedResponse | MoltbookPost[] | null): MoltbookPost[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.posts)) return data.posts;
  return [];
}

export function Feed(props: { api: MoltbookApi; isAuthed: boolean; onOpenPost: (id: string) => void; onOpenSubmolt: (name: string) => void }) {
  const [page, setPage] = useState(1);
  const [posts, setPosts] = useState<MoltbookPost[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const data = props.isAuthed ? await props.api.getPersonalizedFeed(page) : await props.api.getGlobalFeed(page);
        if (cancelled) return;
        setPosts(normalizePosts(data));
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, props.api, props.isAuthed]);

  return (
    <section>
      <h2>{props.isAuthed ? "My feed" : "Global feed"}</h2>

      {(() => {
        const agents = getPinnedAgents();
        const submolts = getPinnedSubmolts();
        if (agents.length === 0 && submolts.length === 0) return null;
        return (
          <div style={{ marginBottom: 16, padding: 12, border: "1px solid var(--color-border)", borderRadius: 8 }}>
            <strong style={{ fontSize: 14 }}>Pinned</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              {submolts.map((s) => (
                <a
                  key={`s-${s}`}
                  href={`#/m/${encodeURIComponent(s)}`}
                  onClick={(e) => { e.preventDefault(); props.onOpenSubmolt(s); }}
                  style={{ padding: "2px 10px", borderRadius: 12, fontSize: 13, background: "var(--color-bg-accent)", textDecoration: "none", color: "inherit" }}
                >
                  m/{s}
                </a>
              ))}
              {agents.map((a) => (
                <a
                  key={`u-${a}`}
                  href={`#/u/${encodeURIComponent(a)}`}
                  style={{ padding: "2px 10px", borderRadius: 12, fontSize: 13, background: "var(--color-bg-accent-alt)", textDecoration: "none", color: "inherit" }}
                >
                  u/{a}
                </a>
              ))}
            </div>
          </div>
        );
      })()}

      {error && <div style={{ color: "crimson" }}>{error}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        {posts.map((p) => {
          const id = String(p.id ?? "");
          const score = (p.upvotes ?? 0) - (p.downvotes ?? 0);
          const subName = p.submolt ? (typeof p.submolt === "string" ? p.submolt : p.submolt.name ?? "") : "";
          const authorName = p.author ? (typeof p.author === "string" ? p.author : p.author.name ?? "") : "";
          return (
            <article key={id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{String(p.title ?? "")}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {subName ? (
                      <>
                        <a
                          href={`#/m/${encodeURIComponent(subName)}`}
                          onClick={(e) => {
                            e.preventDefault();
                            props.onOpenSubmolt(subName);
                          }}
                        >
                          m/{subName}
                        </a>
                      </>
                    ) : (
                      ""
                    )}
                    {authorName ? (
                      <>
                        {" - "}
                        <a href={`#/u/${encodeURIComponent(authorName)}`}>u/{authorName}</a>
                      </>
                    ) : null}
                    {p.created_at ? ` - ${p.created_at}` : ""}
                  </div>
                </div>
                <div style={{ minWidth: 80, textAlign: "right" }}>Score: {score}</div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => props.onOpenPost(id)} disabled={!id}>
                  Open
                </button>
                {p.url && (
                  <a href={String(p.url)} target="_blank" rel="noreferrer noopener">
                    Link
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </button>
        <div>Page {page}</div>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </section>
  );
}
