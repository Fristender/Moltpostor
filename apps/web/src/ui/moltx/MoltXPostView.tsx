import React, { useEffect, useState } from "react";
import type { MoltXApi } from "@moltpostor/api";
import type { MoltXPost } from "@moltpostor/core";
import { MoltXPostCard } from "./MoltXPostCard";
import { useAppContext } from "../AppContext";
import { useMoltXLikes } from "./useMoltXLikes";

export function MoltXPostView(props: {
  api: MoltXApi;
  postId: string;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (name: string) => void;
}) {
  const { addToHistory, cacheContent, getCachedContent, markdownEnabled } = useAppContext();
  const { isLiked, setLiked } = useMoltXLikes();
  const [post, setPost] = useState<MoltXPost | null>(null);
  const [replies, setReplies] = useState<MoltXPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCacheIndicator, setShowCacheIndicator] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cacheIndicatorTimeout: ReturnType<typeof setTimeout> | null = null;
    let fetchCompleted = false;
    setError(null);
    setLoading(true);
    setShowCacheIndicator(false);

    // Try cache first
    const cached = getCachedContent("moltx", "post", props.postId);
    if (cached) {
      setPost(cached.post as MoltXPost);
      setReplies((cached.replies as MoltXPost[]) ?? []);
      setLoading(false);
      // Only show cache indicator after a delay (if fetch is slow)
      cacheIndicatorTimeout = setTimeout(() => {
        if (!cancelled && !fetchCompleted) setShowCacheIndicator(true);
      }, 1000);
    }

    (async () => {
      try {
        const res = await props.api.getPost(props.postId);
        fetchCompleted = true;
        if (cancelled) return;
        if (cacheIndicatorTimeout) {
          clearTimeout(cacheIndicatorTimeout);
          cacheIndicatorTimeout = null;
        }
        // Handle nested response structure
        const resAny = res as unknown as { data?: { post?: MoltXPost; replies?: MoltXPost[] }; post?: MoltXPost; replies?: MoltXPost[] };
        const postData = resAny.data?.post ?? resAny.post ?? (resAny.data as MoltXPost | undefined);
        const repliesData = resAny.data?.replies ?? resAny.replies ?? [];
        const validPost = postData && postData.id ? postData : null;
        const validReplies = Array.isArray(repliesData) ? repliesData : [];
        
        setPost(validPost);
        setReplies(validReplies);
        setShowCacheIndicator(false);

        // Cache the content
        if (validPost) {
          cacheContent({
            id: props.postId,
            platform: "moltx",
            type: "post",
            data: { post: validPost, replies: validReplies },
          });
        }
      } catch (e: unknown) {
        fetchCompleted = true;
        if (cancelled) return;
        if (cacheIndicatorTimeout) {
          clearTimeout(cacheIndicatorTimeout);
          cacheIndicatorTimeout = null;
        }
        // Only show error if we don't have cached data
        const cachedData = getCachedContent("moltx", "post", props.postId);
        if (!cachedData) {
          setError(e instanceof Error ? e.message : String(e));
        } else {
          // Show cache indicator since we're using cached data due to error
          setShowCacheIndicator(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { 
      cancelled = true; 
      if (cacheIndicatorTimeout) clearTimeout(cacheIndicatorTimeout);
    };
  }, [props.api, props.postId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Track in watch history when post is loaded
  useEffect(() => {
    if (!post) return;
    const authorName = post.author?.name ?? post.author_name ?? "";
    addToHistory({
      id: props.postId,
      platform: "moltx",
      type: "post",
      content: (post.content ?? "").slice(0, 200),
      author: authorName,
    });
  }, [post, props.postId, addToHistory]);

  const handleLike = async (postId: string, liked: boolean) => {
    try {
      if (liked) {
        await props.api.unlikePost(postId);
        setLiked(postId, false);
      } else {
        await props.api.likePost(postId);
        setLiked(postId, true);
      }
      if (postId === post?.id) {
        setPost((p) => p ? { ...p, liked_by_me: !liked, like_count: (p.like_count ?? 0) + (liked ? -1 : 1) } : p);
      } else {
        setReplies((prev) =>
          prev.map((r) =>
            r.id === postId
              ? { ...r, liked_by_me: !liked, like_count: (r.like_count ?? 0) + (liked ? -1 : 1) }
              : r
          )
        );
      }
    } catch (e) {
      console.error("Like failed:", e);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await props.api.createReply(props.postId, replyContent.trim());
      const newReply = res.data ?? res.post;
      if (newReply) {
        setReplies((prev) => [newReply, ...prev]);
        setReplyContent("");
      }
    } catch (e) {
      console.error("Reply failed:", e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !post) return <div>Loading...</div>;
  if (error && !post) return <div style={{ color: "crimson" }}>{error}</div>;
  if (!post) return <div>Post not found.</div>;

  return (
    <section>
      {showCacheIndicator && post && (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8, fontStyle: "italic" }}>
          Showing cached version
        </div>
      )}
      <MoltXPostCard
        post={post}
        onOpenPost={props.onOpenPost}
        onOpenUser={props.onOpenUser}
        onLike={props.isAuthed ? handleLike : undefined}
        isLikedOverride={isLiked(post.id)}
        markdownEnabled={markdownEnabled}
      />

      {props.isAuthed && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid var(--color-border)", borderRadius: 8 }}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            maxLength={500}
            style={{ width: "100%", resize: "vertical" }}
            disabled={submitting}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 12, opacity: 0.6 }}>{replyContent.length}/500</span>
            <button onClick={handleReply} disabled={!replyContent.trim() || submitting}>
              {submitting ? "Posting..." : "Reply"}
            </button>
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>Replies ({replies.length})</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {replies.map((r) => (
          <MoltXPostCard
            key={r.id}
            post={r}
            onOpenPost={props.onOpenPost}
            onOpenUser={props.onOpenUser}
            onLike={props.isAuthed ? handleLike : undefined}
            isLikedOverride={isLiked(r.id)}
            markdownEnabled={markdownEnabled}
            compact
          />
        ))}
        {replies.length === 0 && <div style={{ opacity: 0.7 }}>No replies yet.</div>}
      </div>
    </section>
  );
}
