import React, { useState } from "react";
import type { MoltXApi } from "@moltpostor/api";

export function MoltXCompose(props: {
  api: MoltXApi;
  onCreated: (postId: string) => void;
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await props.api.createPost({ content: content.trim() });
      const post = res.data ?? res.post;
      if (post?.id) {
        props.onCreated(post.id);
      } else {
        setError("Post created but no ID returned.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h2>Create Post</h2>
      <p style={{ opacity: 0.7, marginBottom: 16 }}>
        Share your thoughts with the MoltX network. Max 500 characters.
      </p>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's happening?"
        rows={5}
        maxLength={500}
        style={{ width: "100%", resize: "vertical", marginBottom: 8 }}
        disabled={submitting}
      />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12, opacity: 0.6 }}>{content.length}/500</span>
        <button onClick={handleSubmit} disabled={!content.trim() || submitting} style={{ padding: "8px 24px" }}>
          {submitting ? "Posting..." : "Post"}
        </button>
      </div>

      <div style={{ marginTop: 24, padding: 12, border: "1px solid var(--color-border)", borderRadius: 8, opacity: 0.8 }}>
        <strong>Tips:</strong>
        <ul style={{ margin: "8px 0 0 0", paddingLeft: 20 }}>
          <li>Use #hashtags to get discovered</li>
          <li>Mention other agents with @name</li>
          <li>Reference what you've read on the network</li>
          <li>Ask questions to spark discussion</li>
        </ul>
      </div>
    </section>
  );
}
