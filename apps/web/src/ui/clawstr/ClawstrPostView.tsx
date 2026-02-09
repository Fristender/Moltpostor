import React, { useEffect, useState } from "react";
import type { ClawstrApi } from "@moltpostor/api";
import type { ClawstrPost } from "@moltpostor/core";
import { ClawstrPostCard } from "./ClawstrPostCard";
import { useAppContext } from "../AppContext";

export function ClawstrPostView(props: {
  api: ClawstrApi;
  postId: string;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (npub: string) => void;
  onOpenSubclaw: (name: string) => void;
}) {
  const { addToHistory, cacheContent, getCachedContent, saveItem, unsaveItem, isSaved } = useAppContext();
  const [post, setPost] = useState<ClawstrPost | null>(null);
  const [replies, setReplies] = useState<ClawstrPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showCacheIndicator, setShowCacheIndicator] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let fetchCompleted = false;
    setLoading(true);
    setError(null);
    setShowCacheIndicator(false);

    const cached = getCachedContent("clawstr", "post", props.postId);
    if (cached) {
      const data = cached as { post: ClawstrPost; replies: ClawstrPost[] };
      setPost(data.post);
      setReplies(data.replies ?? []);
      setLoading(false);
    }

    const timeout = setTimeout(() => {
      if (!fetchCompleted && cached) setShowCacheIndicator(true);
    }, 2000);

    props.api.getPost(props.postId)
      .then((res) => {
        fetchCompleted = true;
        clearTimeout(timeout);
        if (!cancelled) {
          // Only update if we got valid data with actual author info
          if (res.post && (res.post.author?.name || res.post.author?.display_name)) {
            setPost(res.post);
            setReplies(res.replies);
            cacheContent({
              id: props.postId,
              platform: "clawstr",
              type: "post",
              data: { post: res.post, replies: res.replies },
            });
          } else if (!post && res.post) {
            // No cached post - show what we have
            setPost(res.post);
            setReplies(res.replies);
          }
          setLoading(false);
          setShowCacheIndicator(false);
        }
      })
      .catch((err) => {
        fetchCompleted = true;
        clearTimeout(timeout);
        if (!cancelled) {
          if (!cached) {
            setError(err.message ?? "Failed to load post");
          }
          setLoading(false);
        }
      });

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [props.api, props.postId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!post) return;
    addToHistory({
      id: props.postId,
      platform: "clawstr",
      type: "post",
      content: post.content?.slice(0, 200) ?? "",
      author: post.author?.name ?? post.author?.npub?.slice(0, 12) ?? "",
    });
  }, [post, props.postId, addToHistory]);

  const handleReply = async () => {
    if (!replyContent.trim() || submitting) return;
    setSubmitting(true);
    try {
      const newReply = await props.api.createReply(props.postId, replyContent.trim());
      setReplies((prev) => [...prev, newReply]);
      setReplyContent("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async () => {
    try {
      await props.api.upvote(props.postId);
      alert("Upvoted!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to upvote");
    }
  };

  const handleDownvote = async () => {
    try {
      await props.api.downvote(props.postId);
      alert("Downvoted!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to downvote");
    }
  };

  if (loading && !post) return <p>Loading post from relays...</p>;
  if (error && !post) return <p style={{ color: "crimson" }}>Error: {error}</p>;
  if (!post) return <p>Post not found</p>;

  return (
    <section>
      {showCacheIndicator && (
        <div style={{ padding: 8, background: "var(--color-bg-accent)", borderRadius: 6, marginBottom: 12, fontSize: 13 }}>
          Showing cached version. Fetching latest from relays...
        </div>
      )}

      <ClawstrPostCard
        post={post}
        onOpenPost={props.onOpenPost}
        onOpenUser={props.onOpenUser}
        onOpenSubclaw={props.onOpenSubclaw}
        onSave={() => {
          if (isSaved("clawstr", "post", post.id)) {
            unsaveItem("clawstr", "post", post.id);
          } else {
            saveItem({
              id: post.id,
              platform: "clawstr",
              type: "post",
              content: post.content ?? "",
              author: post.author?.name ?? post.author?.npub?.slice(0, 12) ?? "",
            });
          }
        }}
        isSaved={isSaved("clawstr", "post", post.id)}
        showSubclaw
      />

      {props.isAuthed && (
        <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
          <button onClick={handleUpvote}>+ Upvote</button>
          <button onClick={handleDownvote}>- Downvote</button>
        </div>
      )}

      <h3 style={{ marginTop: 24 }}>Replies ({replies.length})</h3>

      {props.isAuthed && (
        <div style={{ marginBottom: 16 }}>
          <textarea
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid var(--color-border)" }}
          />
          <button onClick={handleReply} disabled={submitting || !replyContent.trim()} style={{ marginTop: 8 }}>
            {submitting ? "Posting..." : "Reply"}
          </button>
        </div>
      )}

      {replies.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No replies yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {replies.map((reply) => (
            <ClawstrPostCard
              key={reply.id}
              post={reply}
              onOpenPost={props.onOpenPost}
              onOpenUser={props.onOpenUser}
              onOpenSubclaw={props.onOpenSubclaw}
              compact
              showSubclaw={false}
            />
          ))}
        </div>
      )}
    </section>
  );
}
