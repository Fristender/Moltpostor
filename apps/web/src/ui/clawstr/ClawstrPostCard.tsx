import React from "react";
import type { ClawstrPost } from "@moltpostor/core";
import { ContentRenderer } from "../ContentRenderer";

function formatDate(timestamp: number): string {
  try {
    const d = new Date(timestamp * 1000);
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
    return "";
  }
}

export function ClawstrPostCard(props: {
  post: ClawstrPost;
  onOpenPost: (id: string, subclaw?: string) => void;
  onOpenUser: (npub: string) => void;
  onOpenSubclaw?: ((name: string) => void) | undefined;
  onSave?: (() => void) | undefined;
  isSaved?: boolean | undefined;
  onUpvote?: (() => void) | undefined;
  onDownvote?: (() => void) | undefined;
  hasUpvoted?: boolean | undefined;
  hasDownvoted?: boolean | undefined;
  compact?: boolean | undefined;
  showSubclaw?: boolean | undefined;
  markdownEnabled?: boolean | undefined;
}) {
  const { post, compact, showSubclaw = true, markdownEnabled = false } = props;
  const author = post.author;
  const displayName = author.display_name ?? author.name ?? author.npub?.slice(0, 12) ?? author.pubkey.slice(0, 8);
  const handle = author.name ?? author.npub?.slice(0, 16) ?? author.pubkey.slice(0, 12);

  return (
    <article
      style={{
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        padding: compact ? 8 : 12,
        background: "var(--color-bg-surface)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {author.picture ? (
          <img src={author.picture} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />
        ) : (
          <span style={{ fontSize: 20 }}>🦀</span>
        )}
        <a
          href="#"
          onClick={(e) => { e.preventDefault(); props.onOpenUser(author.npub ?? author.pubkey); }}
          style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}
        >
          {displayName}
        </a>
        <span style={{ opacity: 0.6, fontSize: 13 }}>@{handle}</span>
        <span style={{ opacity: 0.5, fontSize: 12 }}>{formatDate(post.created_at)}</span>
      </div>

      {showSubclaw && post.subclaw && (
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>
          in{" "}
          <a
            href="#"
            onClick={(e) => { e.preventDefault(); props.onOpenSubclaw?.(post.subclaw!); }}
            style={{ color: "var(--color-link)" }}
          >
            /c/{post.subclaw}
          </a>
        </div>
      )}

      {post.isReply && (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
          Reply
        </div>
      )}

      <div
        style={{ marginBottom: 8, cursor: "pointer" }}
        onClick={() => props.onOpenPost(post.noteId, post.subclaw)}
      >
        <ContentRenderer content={post.content} platform="clawstr" markdownEnabled={markdownEnabled} />
      </div>

      <div style={{ display: "flex", gap: 16, fontSize: 13, opacity: 0.8, alignItems: "center" }}>
        {props.onUpvote ? (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={props.onUpvote}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: props.hasUpvoted ? "green" : "inherit",
                fontWeight: props.hasUpvoted ? 700 : 400,
              }}
              title={props.hasUpvoted ? "Remove upvote" : "Upvote"}
            >
              ▲
            </button>
            <span style={{ color: (post.upvotes ?? 0) - (post.downvotes ?? 0) > 0 ? "green" : (post.upvotes ?? 0) - (post.downvotes ?? 0) < 0 ? "crimson" : "inherit" }}>
              {(post.upvotes ?? 0) - (post.downvotes ?? 0)}
            </span>
            <button
              onClick={props.onDownvote}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: props.hasDownvoted ? "crimson" : "inherit",
                fontWeight: props.hasDownvoted ? 700 : 400,
              }}
              title={props.hasDownvoted ? "Remove downvote" : "Downvote"}
            >
              ▼
            </button>
          </span>
        ) : (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: (post.upvotes ?? 0) - (post.downvotes ?? 0) > 0 ? "green" : (post.upvotes ?? 0) - (post.downvotes ?? 0) < 0 ? "crimson" : "inherit" }}>
              {(post.upvotes ?? 0) - (post.downvotes ?? 0)}
            </span>
            <span>votes</span>
          </span>
        )}
        <button
          onClick={() => props.onOpenPost(post.noteId, post.subclaw)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4 }}
        >
          <span>{post.replyCount ?? 0}</span> replies
        </button>
        <span style={{ opacity: 0.6 }}>ID: {post.noteId.slice(0, 12)}...</span>
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
