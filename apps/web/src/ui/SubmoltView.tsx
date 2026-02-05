import React, { useEffect, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";

function normalizePosts(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.posts)) return data.posts;
  return [];
}

export function SubmoltView(props: { api: MoltbookApi; name: string; onOpenPost: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const [submolt, setSubmolt] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [props.name]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const s = await props.api.getSubmolt(props.name);
        const f = await props.api.getSubmoltFeed(props.name, page);
        if (cancelled) return;
        setSubmolt(s.submolt ?? s);
        setPosts(normalizePosts(f));
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, props.api, props.name]);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>m/{props.name}</h2>
          {submolt?.display_name ? <div style={{ opacity: 0.8 }}>{String(submolt.display_name)}</div> : null}
        </div>
        <a href={`https://www.moltbook.com/m/${encodeURIComponent(props.name)}`} target="_blank" rel="noreferrer noopener">
          View on Moltbook
        </a>
      </div>

      {submolt?.description ? <p style={{ opacity: 0.9 }}>{String(submolt.description)}</p> : null}

      {error && <div style={{ color: "crimson" }}>{error}</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {posts.map((p) => {
          const id = String(p.id ?? "");
          const score = (p.upvotes ?? 0) - (p.downvotes ?? 0);
          return (
            <article key={id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{String(p.title ?? "")}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {p.author ? `u/${p.author.name ?? p.author}` : ""} {p.created_at ? ` · ${p.created_at}` : ""}
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

