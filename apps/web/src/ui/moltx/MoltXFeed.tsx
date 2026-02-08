import React, { useEffect, useState } from "react";
import type { MoltXApi } from "@moltpostor/api";
import type { MoltXPost, MoltXFeedResponse } from "@moltpostor/core";
import { MoltXPostCard } from "./MoltXPostCard";

type FeedType = "global" | "following" | "mentions";

function normalizePosts(data: MoltXFeedResponse | null): MoltXPost[] {
  if (!data) return [];
  // Handle { data: { posts: [...] } } structure
  const inner = data.data as { posts?: MoltXPost[] } | MoltXPost[] | undefined;
  if (inner && typeof inner === "object" && !Array.isArray(inner) && Array.isArray(inner.posts)) {
    return inner.posts;
  }
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(data.posts)) return data.posts;
  return [];
}

export function MoltXFeed(props: {
  api: MoltXApi;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (name: string) => void;
  onOpenHashtag?: (tag: string) => void;
  onCompose: () => void;
  onSavePost?: (post: MoltXPost) => void;
  isPostSaved?: (id: string) => boolean;
  onWalletRequired?: () => void;
}) {
  const [feedType, setFeedType] = useState<FeedType>(props.isAuthed ? "following" : "global");
  const [posts, setPosts] = useState<MoltXPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [walletError, setWalletError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 20;

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        let data: MoltXFeedResponse;
        if (feedType === "following" && props.isAuthed) {
          data = await props.api.getFollowingFeed({ limit, offset });
        } else if (feedType === "mentions" && props.isAuthed) {
          data = await props.api.getMentionsFeed({ limit, offset });
        } else {
          data = await props.api.getGlobalFeed({ limit, offset, type: "post,quote" });
        }
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
  }, [feedType, offset, props.api, props.isAuthed]);

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
      setWalletError(false);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("403") || msg.includes("wallet")) {
        setWalletError(true);
        props.onWalletRequired?.();
      }
      console.error("Like failed:", e);
    }
  };

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>MoltX Feed</h2>
        {props.isAuthed && (
          <button onClick={props.onCompose} style={{ padding: "8px 16px", fontWeight: 600 }}>
            + Post
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => { setFeedType("global"); setOffset(0); }}
          style={{ fontWeight: feedType === "global" ? 700 : 400, padding: "6px 12px", borderRadius: 6, background: feedType === "global" ? "var(--color-bg-accent)" : "transparent", border: "1px solid var(--color-border)" }}
        >
          Global
        </button>
        {props.isAuthed && (
          <>
            <button
              onClick={() => { setFeedType("following"); setOffset(0); }}
              style={{ fontWeight: feedType === "following" ? 700 : 400, padding: "6px 12px", borderRadius: 6, background: feedType === "following" ? "var(--color-bg-accent)" : "transparent", border: "1px solid var(--color-border)" }}
            >
              Following
            </button>
            <button
              onClick={() => { setFeedType("mentions"); setOffset(0); }}
              style={{ fontWeight: feedType === "mentions" ? 700 : 400, padding: "6px 12px", borderRadius: 6, background: feedType === "mentions" ? "var(--color-bg-accent)" : "transparent", border: "1px solid var(--color-border)" }}
            >
              Mentions
            </button>
          </>
        )}
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ opacity: 0.7, marginBottom: 12 }}>Loading...</div>}

      {walletError && (
        <div style={{ 
          position: "fixed",
          bottom: 80,
          left: 16,
          right: 16,
          maxWidth: 400,
          margin: "0 auto",
          padding: 12, 
          background: "var(--color-bg-surface)", 
          border: "1px solid var(--color-border)", 
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          zIndex: 100,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <strong>Wallet Required</strong>
              <p style={{ margin: "8px 0 0", fontSize: 13, opacity: 0.8 }}>
                Link an EVM wallet to like, follow, and post. Click the API key dropdown and select "Link Wallet".
              </p>
            </div>
            <button 
              onClick={() => setWalletError(false)} 
              style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", padding: 0, lineHeight: 1 }}
            >
              &times;
            </button>
          </div>
        </div>
      )}

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
        {!loading && posts.length === 0 && <div style={{ opacity: 0.7 }}>No posts found.</div>}
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
