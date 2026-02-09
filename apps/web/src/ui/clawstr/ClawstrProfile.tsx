import React, { useEffect, useState } from "react";
import type { ClawstrApi } from "@moltpostor/api";
import type { ClawstrAuthor, ClawstrPost } from "@moltpostor/core";
import { ClawstrPostCard } from "./ClawstrPostCard";
import { useAppContext } from "../AppContext";
import { isClawstrUserPinned, pinClawstrUser, unpinClawstrUser } from "./clawstrPins";

export function ClawstrProfile(props: {
  api: ClawstrApi;
  npub: string;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (npub: string) => void;
  onOpenSubclaw: (name: string) => void;
}) {
  const { addToHistory, cacheContent, getCachedContent, markdownEnabled } = useAppContext();
  const [author, setAuthor] = useState<ClawstrAuthor | null>(null);
  const [posts, setPosts] = useState<ClawstrPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pinned, setPinned] = useState(() => isClawstrUserPinned(props.npub));

  const handleTogglePin = () => {
    if (pinned) {
      unpinClawstrUser(props.npub);
      setPinned(false);
    } else {
      const name = author?.display_name ?? author?.name ?? props.npub.slice(0, 12);
      pinClawstrUser(props.npub, name);
      setPinned(true);
    }
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const cached = getCachedContent("clawstr", "user", props.npub);
    if (cached) {
      const data = cached as { author: ClawstrAuthor; posts: ClawstrPost[] };
      setAuthor(data.author);
      setPosts(data.posts ?? []);
      setLoading(false);
    }

    props.api.getProfile(props.npub)
      .then((res) => {
        if (!cancelled) {
          // Always update with fresh data if we got an author
          if (res.author) {
            setAuthor(res.author);
            setPosts(res.posts);
            // Only cache if we have actual author info (not just pubkey/npub fallback)
            if (res.author.name || res.author.display_name) {
              cacheContent({
                id: props.npub,
                platform: "clawstr",
                type: "user",
                data: { author: res.author, posts: res.posts },
              });
            }
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (!cached) {
            setError(err.message ?? "Failed to load profile");
          }
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [props.api, props.npub]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!author) return;
    addToHistory({
      id: props.npub,
      platform: "clawstr",
      type: "user",
      name: author.name ?? author.display_name ?? author.npub?.slice(0, 16) ?? "",
      content: author.about?.slice(0, 200) ?? "",
      author: author.name ?? author.npub?.slice(0, 12) ?? "",
    });
  }, [author, props.npub, addToHistory]);

  if (loading && !author) return <p>Loading profile from relays...</p>;
  if (error && !author) return <p style={{ color: "crimson" }}>Error: {error}</p>;
  if (!author) return <p>Profile not found</p>;

  const displayName = author.display_name ?? author.name ?? author.npub?.slice(0, 16);
  const handle = author.name ?? author.npub?.slice(0, 20);

  return (
    <section>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 24 }}>
        {author.picture ? (
          <img src={author.picture} alt="" style={{ width: 64, height: 64, borderRadius: "50%" }} />
        ) : (
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--color-bg-accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>
            🦀
          </div>
        )}
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{displayName}</h2>
          <p style={{ opacity: 0.7, margin: "4px 0" }}>@{handle}</p>
          {author.nip05 && (
            <p style={{ fontSize: 13, opacity: 0.8, margin: "4px 0" }}>
              {author.nip05}
            </p>
          )}
          {author.about && (
            <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{author.about}</p>
          )}
          <p style={{ fontSize: 12, opacity: 0.6, marginTop: 8 }}>
            Pubkey: {author.pubkey.slice(0, 16)}...
          </p>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button onClick={handleTogglePin}>
              {pinned ? "Unpin User" : "Pin User"}
            </button>
          </div>
        </div>
      </div>

      <h3>Posts ({posts.length})</h3>

      {posts.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No Clawstr posts found for this user.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {posts.map((post) => (
            <ClawstrPostCard
              key={post.id}
              post={post}
              onOpenPost={props.onOpenPost}
              onOpenUser={props.onOpenUser}
              onOpenSubclaw={props.onOpenSubclaw}
              markdownEnabled={markdownEnabled}
              showSubclaw
            />
          ))}
        </div>
      )}
    </section>
  );
}
