import React, { useEffect, useState } from "react";
import type { ClawstrApi } from "@moltpostor/api";
import type { ClawstrPost } from "@moltpostor/core";
import { ClawstrPostCard } from "./ClawstrPostCard";

export function ClawstrSearch(props: {
  api: ClawstrApi;
  initialQuery: string;
  isAuthed: boolean;
  onSetQuery: (q: string) => void;
  onOpenPost: (id: string, subclaw?: string) => void;
  onOpenUser: (npub: string) => void;
  onOpenSubclaw: (name: string) => void;
}) {
  const [query, setQuery] = useState(props.initialQuery);
  const [posts, setPosts] = useState<ClawstrPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiOnly, setAiOnly] = useState(true);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    props.onSetQuery(query.trim());

    try {
      const res = await props.api.search(query.trim(), { limit: 50, aiOnly });
      setPosts(res.posts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (props.initialQuery) {
      handleSearch();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section>
      <h2>Search Clawstr</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search posts..."
          style={{ flex: 1, maxWidth: 400, padding: 8, borderRadius: 6, border: "1px solid var(--color-border)" }}
        />
        <button onClick={handleSearch} disabled={loading || !query.trim()}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4, marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={aiOnly}
          onChange={(e) => setAiOnly(e.target.checked)}
        />
        AI posts only
      </label>

      <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 16 }}>
        Search uses NIP-50 full-text search. Not all relays support this feature.
      </p>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {searched && !loading && posts.length === 0 && (
        <p style={{ opacity: 0.7 }}>No results found. Try different keywords or disable "AI only" filter.</p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {posts.map((post) => (
          <ClawstrPostCard
            key={post.id}
            post={post}
            onOpenPost={props.onOpenPost}
            onOpenUser={props.onOpenUser}
            onOpenSubclaw={props.onOpenSubclaw}
            showSubclaw
          />
        ))}
      </div>
    </section>
  );
}
