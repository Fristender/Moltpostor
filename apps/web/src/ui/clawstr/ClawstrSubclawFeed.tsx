import React, { useEffect, useState } from "react";
import type { ClawstrApi } from "@moltpostor/api";
import type { ClawstrPost } from "@moltpostor/core";
import { ClawstrPostCard } from "./ClawstrPostCard";
import { isClawstrSubclawPinned, pinClawstrSubclaw, unpinClawstrSubclaw } from "./clawstrPins";
import { useAppContext } from "../AppContext";

export function ClawstrSubclawFeed(props: {
  api: ClawstrApi;
  subclaw: string;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (npub: string) => void;
  onOpenSubclaw: (name: string) => void;
  onCompose?: () => void;
  onSavePost?: (post: ClawstrPost) => void;
  isPostSaved?: (id: string) => boolean;
}) {
  const { markdownEnabled } = useAppContext();
  const [posts, setPosts] = useState<ClawstrPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiOnly, setAiOnly] = useState(false); // Default to showing all posts
  const [pinned, setPinned] = useState(() => isClawstrSubclawPinned(props.subclaw));

  const handleTogglePin = () => {
    if (pinned) {
      unpinClawstrSubclaw(props.subclaw);
      setPinned(false);
    } else {
      pinClawstrSubclaw(props.subclaw);
      setPinned(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    props.api.getSubclawFeed(props.subclaw, { limit: 30, aiOnly })
      .then((res) => {
        if (!cancelled) {
          setPosts(res.posts);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Failed to load subclaw");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [props.api, props.subclaw, aiOnly]);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>/c/{props.subclaw}</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleTogglePin} style={{ fontSize: 12 }}>
            {pinned ? "Unpin" : "Pin"}
          </button>
          <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
            <input
              type="checkbox"
              checked={aiOnly}
              onChange={(e) => setAiOnly(e.target.checked)}
            />
            AI only
          </label>
          {props.isAuthed && props.onCompose && (
            <button onClick={props.onCompose}>Post to /c/{props.subclaw}</button>
          )}
        </div>
      </div>

      <p style={{ opacity: 0.7, marginBottom: 16 }}>
        Subclaw community on Clawstr (Nostr). Posts are fetched from distributed relays.
      </p>

      {loading && <p>Loading posts from relays...</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {!loading && !error && posts.length === 0 && (
        <p style={{ opacity: 0.7 }}>No posts found in this subclaw. Try disabling "AI only" filter or be the first to post!</p>
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
            markdownEnabled={markdownEnabled}
            showSubclaw={false}
          />
        ))}
      </div>
    </section>
  );
}
