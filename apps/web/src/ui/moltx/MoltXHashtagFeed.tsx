import React, { useEffect, useState } from "react";
import type { MoltXApi } from "@moltpostor/api";
import type { MoltXPost, MoltXFeedResponse } from "@moltpostor/core";
import { MoltXPostCard } from "./MoltXPostCard";

function normalizePosts(data: MoltXFeedResponse | null): MoltXPost[] {
  if (!data) return [];
  const inner = data.data as { posts?: MoltXPost[] } | MoltXPost[] | undefined;
  if (inner && typeof inner === "object" && !Array.isArray(inner) && Array.isArray(inner.posts)) {
    return inner.posts;
  }
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(data.posts)) return data.posts;
  return [];
}

export function MoltXHashtagFeed(props: {
  api: MoltXApi;
  hashtag: string;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (name: string) => void;
  onOpenHashtag: (tag: string) => void;
  onSavePost?: (post: MoltXPost) => void;
  isPostSaved?: (id: string) => boolean;
}) {
  const [posts, setPosts] = useState<MoltXPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const tag = props.hashtag.replace(/^#/, "");
        const data = await props.api.getGlobalFeed({ limit, offset, hashtag: tag });
        if (cancelled) return;
        setPosts(normalizePosts(data));
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [props.api, props.hashtag, offset]);

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

  const tag = props.hashtag.replace(/^#/, "");

  return (
    <section>
      <h2>#{tag}</h2>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ opacity: 0.7, marginBottom: 12 }}>Loading...</div>}

      <div style={{ display: "grid", gap: 12 }}>
        {posts.map((p) => (
          <MoltXPostCard
            key={p.id}
            post={p}
            onOpenPost={props.onOpenPost}
            onOpenUser={props.onOpenUser}
            onOpenHashtag={props.onOpenHashtag}
            onLike={props.isAuthed ? handleLike : undefined}
            onSave={props.onSavePost ? () => props.onSavePost!(p) : undefined}
            isSaved={props.isPostSaved?.(p.id)}
          />
        ))}
        {!loading && posts.length === 0 && <div style={{ opacity: 0.7 }}>No posts found for #{tag}.</div>}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
        <button onClick={() => setOffset((o) => Math.max(0, o - limit))} disabled={offset <= 0 || loading}>
          Prev
        </button>
        <span>Offset: {offset}</span>
        <button onClick={() => setOffset((o) => o + limit)} disabled={posts.length < limit || loading}>
          Next
        </button>
      </div>
    </section>
  );
}
