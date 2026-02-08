import React from "react";
import type { MoltXPost } from "@moltpostor/core";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

export function MoltXPostCard(props: {
  post: MoltXPost;
  onOpenPost: (id: string) => void;
  onOpenUser: (name: string) => void;
  onOpenHashtag?: ((tag: string) => void) | undefined;
  onLike?: ((postId: string, currentlyLiked: boolean) => void) | undefined;
  onSave?: (() => void) | undefined;
  isSaved?: boolean | undefined;
  compact?: boolean | undefined;
}) {
  const { post, compact } = props;
  // Handle both nested author object and flat author fields
  const authorName = post.author?.name ?? post.author_name ?? "Unknown";
  const displayName = post.author?.display_name ?? post.author_display_name ?? authorName;
  const avatar = post.author?.avatar_emoji ?? post.author_avatar_emoji ?? post.author?.avatar_url ?? post.author_avatar_url;

  return (
    <article
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: compact ? 8 : 12,
        background: "var(--color-bg-surface)",
      }}
    >
      {post.type === "repost" && (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
          Reposted by{" "}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); props.onOpenUser(authorName); }}
            style={{ fontWeight: 600 }}
          >
            {displayName}
          </a>
        </div>
      )}

      {post.type === "quote" && post.content && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            {avatar && <span style={{ fontSize: 20 }}>{avatar.startsWith("http") ? <img src={avatar} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} /> : avatar}</span>}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); props.onOpenUser(authorName); }}
              style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}
            >
              {displayName}
            </a>
            <span style={{ opacity: 0.6, fontSize: 13 }}>@{authorName}</span>
            <span style={{ opacity: 0.5, fontSize: 12 }}>{formatDate(post.created_at)}</span>
          </div>
          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{post.content}</div>
        </div>
      )}

      {post.quoted_post && (
        <div
          style={{
            border: "1px solid var(--color-border)",
            borderRadius: 6,
            padding: 8,
            marginBottom: 8,
            opacity: 0.9,
            cursor: "pointer",
          }}
          onClick={() => props.onOpenPost(post.quoted_post!.id)}
        >
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
            @{post.quoted_post.author?.name ?? "Unknown"}
          </div>
          <div style={{ fontSize: 14 }}>{post.quoted_post.content}</div>
        </div>
      )}

      {post.type !== "repost" && post.type !== "quote" && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            {avatar && <span style={{ fontSize: 20 }}>{avatar.startsWith("http") ? <img src={avatar} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} /> : avatar}</span>}
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); props.onOpenUser(authorName); }}
              style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}
            >
              {displayName}
            </a>
            <span style={{ opacity: 0.6, fontSize: 13 }}>@{authorName}</span>
            <span style={{ opacity: 0.5, fontSize: 12 }}>{formatDate(post.created_at)}</span>
          </div>

          {post.type === "reply" && post.parent && (
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
              Replying to @{post.parent.author?.name ?? "Unknown"}
            </div>
          )}

          <div 
            style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 8, cursor: "pointer" }}
            onClick={() => props.onOpenPost(post.id)}
          >
            {post.content}
          </div>
        </>
      )}

      {post.media_url && (
        <div style={{ marginBottom: 8 }}>
          <img
            src={post.media_url}
            alt="Media"
            style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 8 }}
          />
        </div>
      )}

      {(() => {
        const hashtags = typeof post.hashtags === "string" 
          ? (JSON.parse(post.hashtags || "[]") as string[])
          : (post.hashtags ?? []);
        if (hashtags.length === 0) return null;
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {hashtags.map((tag: string) => (
              <span
                key={tag}
                onClick={() => props.onOpenHashtag?.(tag)}
                style={{ fontSize: 12, color: "var(--color-link)", cursor: props.onOpenHashtag ? "pointer" : "default" }}
              >
                #{tag}
              </span>
            ))}
          </div>
        );
      })()}

      <div style={{ display: "flex", gap: 16, fontSize: 13, opacity: 0.8, alignItems: "center" }}>
        <button
          onClick={() => props.onOpenPost(post.id)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
        >
          <span>{post.reply_count ?? 0}</span> replies
        </button>
        <button
          onClick={() => props.onLike?.(post.id, !!post.liked_by_me)}
          disabled={!props.onLike}
          style={{
            background: "none",
            border: "none",
            cursor: props.onLike ? "pointer" : "default",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 4,
            color: post.liked_by_me ? "crimson" : "inherit",
          }}
        >
          <span>{post.liked_by_me ? "♥" : "♡"}</span>
          <span>{post.like_count ?? 0}</span>
        </button>
        <span>{post.repost_count ?? 0} reposts</span>
        {post.impression_count !== undefined && <span>{post.impression_count} views</span>}
        {props.onSave && (
          <button
            onClick={props.onSave}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginLeft: "auto",
              color: props.isSaved ? "var(--color-link)" : "inherit",
            }}
            title={props.isSaved ? "Saved" : "Save"}
          >
            {props.isSaved ? "★" : "☆"}
          </button>
        )}
      </div>
    </article>
  );
}
