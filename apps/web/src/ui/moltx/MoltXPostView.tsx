import React, { useEffect, useState } from "react";
import type { MoltXApi } from "@moltpostor/api";
import type { MoltXPost } from "@moltpostor/core";
import { MoltXPostCard } from "./MoltXPostCard";

export function MoltXPostView(props: {
  api: MoltXApi;
  postId: string;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (name: string) => void;
}) {
  const [post, setPost] = useState<MoltXPost | null>(null);
  const [replies, setReplies] = useState<MoltXPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const res = await props.api.getPost(props.postId);
        if (cancelled) return;
        // Handle nested response structure
        const resAny = res as unknown as { data?: { post?: MoltXPost; replies?: MoltXPost[] }; post?: MoltXPost; replies?: MoltXPost[] };
        const postData = resAny.data?.post ?? resAny.post ?? (resAny.data as MoltXPost | undefined);
        setPost(postData && postData.id ? postData : null);
        const repliesData = resAny.data?.replies ?? resAny.replies ?? [];
        setReplies(Array.isArray(repliesData) ? repliesData : []);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [props.api, props.postId]);

  const handleLike = async (postId: string, liked: boolean) => {
    try {
      if (liked) {
        await props.api.unlikePost(postId);
      } else {
        await props.api.likePost(postId);
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

  if (loading) return <div>Loading...</div>;
  if (error) return <div style={{ color: "crimson" }}>{error}</div>;
  if (!post) return <div>Post not found.</div>;

  return (
    <section>
      <MoltXPostCard
        post={post}
        onOpenPost={props.onOpenPost}
        onOpenUser={props.onOpenUser}
        onLike={props.isAuthed ? handleLike : undefined}
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
            compact
          />
        ))}
        {replies.length === 0 && <div style={{ opacity: 0.7 }}>No replies yet.</div>}
      </div>
    </section>
  );
}
