import React, { useEffect, useState } from "react";
import type { MoltXApi } from "@moltpostor/api";
import type { MoltXPost, MoltXAgent, MoltXHashtag } from "@moltpostor/core";
import { MoltXPostCard } from "./MoltXPostCard";

type SearchType = "posts" | "agents";

export function MoltXSearch(props: {
  api: MoltXApi;
  initialQuery: string;
  isAuthed: boolean;
  onSetQuery: (q: string) => void;
  onOpenPost: (id: string) => void;
  onOpenUser: (name: string) => void;
}) {
  const [query, setQuery] = useState(props.initialQuery);
  const [searchType, setSearchType] = useState<SearchType>("posts");
  const [posts, setPosts] = useState<MoltXPost[]>([]);
  const [agents, setAgents] = useState<MoltXAgent[]>([]);
  const [trending, setTrending] = useState<MoltXHashtag[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await props.api.getTrendingHashtags(10);
        if (cancelled) return;
        setTrending(res.data ?? res.hashtags ?? []);
      } catch {
        // Ignore trending errors
      }
    })();
    return () => { cancelled = true; };
  }, [props.api]);

  useEffect(() => {
    if (!props.initialQuery.trim()) return;
    let cancelled = false;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        if (searchType === "posts") {
          const res = await props.api.searchPosts(props.initialQuery, { limit: 30 });
          if (cancelled) return;
          setPosts(res.data?.posts ?? []);
          setAgents([]);
        } else {
          const res = await props.api.searchAgents(props.initialQuery, { limit: 30 });
          if (cancelled) return;
          setAgents(res.data?.agents ?? []);
          setPosts([]);
        }
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [props.api, props.initialQuery, searchType]);

  const handleSearch = () => {
    const q = query.trim();
    if (q) props.onSetQuery(q);
  };

  const handleLike = async (postId: string, liked: boolean) => {
    try {
      if (liked) {
        await props.api.unlikePost(postId);
      } else {
        await props.api.likePost(postId);
      }
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, liked_by_me: !liked, like_count: (p.like_count ?? 0) + (liked ? -1 : 1) }
            : p
        )
      );
    } catch (e) {
      console.error("Like failed:", e);
    }
  };

  return (
    <section>
      <h2>Search MoltX</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search posts or agents..."
          style={{ flex: 1 }}
        />
        <button onClick={handleSearch} disabled={!query.trim()}>
          Search
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => setSearchType("posts")}
          style={{ fontWeight: searchType === "posts" ? 700 : 400, padding: "6px 12px", borderRadius: 6, background: searchType === "posts" ? "var(--color-bg-accent)" : "transparent", border: "1px solid var(--color-border)" }}
        >
          Posts
        </button>
        <button
          onClick={() => setSearchType("agents")}
          style={{ fontWeight: searchType === "agents" ? 700 : 400, padding: "6px 12px", borderRadius: 6, background: searchType === "agents" ? "var(--color-bg-accent)" : "transparent", border: "1px solid var(--color-border)" }}
        >
          Agents
        </button>
      </div>

      {trending.length > 0 && !props.initialQuery && (
        <div style={{ marginBottom: 16, padding: 12, border: "1px solid var(--color-border)", borderRadius: 8 }}>
          <strong style={{ fontSize: 14 }}>Trending Hashtags</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {trending.map((t) => (
              <button
                key={t.tag}
                onClick={() => { setQuery(`#${t.tag}`); props.onSetQuery(`#${t.tag}`); }}
                style={{ padding: "4px 10px", borderRadius: 12, fontSize: 13, background: "var(--color-bg-accent)", border: "none", cursor: "pointer" }}
              >
                #{t.tag} <span style={{ opacity: 0.6 }}>({t.post_count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ opacity: 0.7, marginBottom: 12 }}>Searching...</div>}

      {searchType === "posts" && (
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map((p) => (
            <MoltXPostCard
              key={p.id}
              post={p}
              onOpenPost={props.onOpenPost}
              onOpenUser={props.onOpenUser}
              onLike={props.isAuthed ? handleLike : undefined}
            />
          ))}
          {!loading && props.initialQuery && posts.length === 0 && (
            <div style={{ opacity: 0.7 }}>No posts found.</div>
          )}
        </div>
      )}

      {searchType === "agents" && (
        <div style={{ display: "grid", gap: 12 }}>
          {agents.map((a) => (
            <article
              key={a.name}
              onClick={() => props.onOpenUser(a.name)}
              style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 12, cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {a.avatar_emoji && <span style={{ fontSize: 24 }}>{a.avatar_emoji}</span>}
                <div>
                  <div style={{ fontWeight: 600 }}>{a.display_name ?? a.name}</div>
                  <div style={{ fontSize: 13, opacity: 0.6 }}>@{a.name}</div>
                </div>
                {a.claim_status === "claimed" && <span title="Verified" style={{ color: "#1da1f2" }}>✓</span>}
              </div>
              {a.description && <p style={{ marginTop: 8, fontSize: 14 }}>{a.description}</p>}
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 13, opacity: 0.7 }}>
                <span>{a.follower_count ?? 0} followers</span>
                <span>{a.post_count ?? 0} posts</span>
              </div>
            </article>
          ))}
          {!loading && props.initialQuery && agents.length === 0 && (
            <div style={{ opacity: 0.7 }}>No agents found.</div>
          )}
        </div>
      )}
    </section>
  );
}
