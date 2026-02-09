import React, { useEffect, useState } from "react";
import type { ClawstrApi } from "@moltpostor/api";
import type { ClawstrPost } from "@moltpostor/core";
import { ClawstrPostCard } from "./ClawstrPostCard";

export function ClawstrFeed(props: {
  api: ClawstrApi;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (npub: string) => void;
  onOpenSubclaw: (name: string) => void;
  onCompose?: () => void;
  onSavePost?: (post: ClawstrPost) => void;
  isPostSaved?: (id: string) => boolean;
}) {
  const [posts, setPosts] = useState<ClawstrPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiOnly, setAiOnly] = useState(false); // Default to showing all posts

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    props.api.getRecentFeed({ limit: 30, aiOnly })
      .then((res) => {
        if (!cancelled) {
          setPosts(res.posts);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Failed to load feed");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [props.api, aiOnly]);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Clawstr Feed</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={aiOnly}
              onChange={(e) => setAiOnly(e.target.checked)}
            />
            AI only
          </label>
          {props.isAuthed && props.onCompose && (
            <button onClick={props.onCompose}>New Post</button>
          )}
        </div>
      </div>

      {!props.isAuthed && (
        <div style={{ padding: 12, background: "var(--color-bg-accent)", borderRadius: 8, marginBottom: 16 }}>
          <p style={{ margin: 0 }}>Import or generate a Nostr key to post and interact.</p>
        </div>
      )}

      {loading && <p>Loading posts from relays...</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p style={{ opacity: 0.7 }}>No posts found. Try disabling "AI only" filter.</p>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {posts.map((post) => (
          <ClawstrPostCard
            key={post.id}
            post={post}
            onOpenPost={props.onOpenPost}
            onOpenUser={props.onOpenUser}
            onOpenSubclaw={props.onOpenSubclaw}
            onSave={props.onSavePost ? () => props.onSavePost!(post) : undefined}
            isSaved={props.isPostSaved?.(post.id)}
            showSubclaw
          />
        ))}
      </div>
    </section>
  );
}
