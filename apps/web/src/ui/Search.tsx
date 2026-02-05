import React, { useEffect, useMemo, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";

function asArray(x: any): any[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [];
}

export function Search(props: {
  api: MoltbookApi;
  initialQuery: string;
  onSetQuery: (q: string) => void;
  onOpenPost: (id: string) => void;
  onOpenSubmolt: (name: string) => void;
  onOpenUser: (name: string) => void;
}) {
  const [query, setQuery] = useState(props.initialQuery);
  const [results, setResults] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(props.initialQuery);
  }, [props.initialQuery]);

  useEffect(() => {
    const q = props.initialQuery.trim();
    if (q.length < 2) {
      setResults(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await props.api.search(q, { limit: 25 });
        if (cancelled) return;
        setResults(data);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? String(e));
        setResults(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.api, props.initialQuery]);

  const posts = useMemo(() => asArray(results?.posts), [results]);
  const agents = useMemo(() => asArray(results?.agents), [results]);
  const submolts = useMemo(() => asArray(results?.submolts), [results]);

  return (
    <section>
      <h2>Search</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          props.onSetQuery(query.trim());
        }}
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search posts, users, submolts..." style={{ flex: 1 }} />
        <button type="submit" disabled={query.trim().length < 2}>
          Search
        </button>
      </form>

      {error && <div style={{ color: "crimson", marginTop: 8 }}>{error}</div>}
      {loading && <div style={{ marginTop: 8, opacity: 0.8 }}>Searching...</div>}
      {!loading && !error && props.initialQuery.trim().length < 2 ? <div style={{ marginTop: 8, opacity: 0.8 }}>Type at least 2 characters.</div> : null}

      {posts.length > 0 ? (
        <>
          <hr />
          <h3>Posts</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {posts.map((p) => {
              const id = String(p.id ?? "");
              const title = String(p.title ?? "");
              const subName = p.submolt ? String(p.submolt.name ?? p.submolt) : String(p.submoltName ?? p.submolt ?? "");
              const authorName = p.author ? String(p.author.name ?? p.author) : String(p.authorName ?? "");
              const score = (p.upvotes ?? p.score ?? 0) - (p.downvotes ?? 0);
              return (
                <article key={id || `${title}-${Math.random()}`} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{title}</div>
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
                        ) : null}
                        {authorName ? (
                          <>
                            {" - "}
                            <a
                              href={`#/u/${encodeURIComponent(authorName)}`}
                              onClick={(e) => {
                                e.preventDefault();
                                props.onOpenUser(authorName);
                              }}
                            >
                              u/{authorName}
                            </a>
                          </>
                        ) : null}
                        {p.created_at ? ` - ${p.created_at}` : p.createdAt ? ` - ${p.createdAt}` : ""}
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
        </>
      ) : null}

      {agents.length > 0 ? (
        <>
          <hr />
          <h3>Users</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {agents.map((a) => {
              const name = String(a.name ?? "");
              const displayName = String(a.display_name ?? a.displayName ?? "");
              return (
                <div key={name || Math.random()}>
                  <a
                    href={`#/u/${encodeURIComponent(name)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      props.onOpenUser(name);
                    }}
                  >
                    u/{name}
                  </a>
                  {displayName ? <span style={{ opacity: 0.8 }}>{` - ${displayName}`}</span> : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {submolts.length > 0 ? (
        <>
          <hr />
          <h3>Submolts</h3>
          <div style={{ display: "grid", gap: 8 }}>
            {submolts.map((s) => {
              const name = String(s.name ?? "");
              const displayName = String(s.display_name ?? s.displayName ?? "");
              return (
                <div key={name || Math.random()}>
                  <a
                    href={`#/m/${encodeURIComponent(name)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      props.onOpenSubmolt(name);
                    }}
                  >
                    m/{name}
                  </a>
                  {displayName ? <span style={{ opacity: 0.8 }}>{` - ${displayName}`}</span> : null}
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {results && posts.length === 0 && agents.length === 0 && submolts.length === 0 && !loading && !error ? (
        <div style={{ marginTop: 8, opacity: 0.8 }}>No results.</div>
      ) : null}
    </section>
  );
}

