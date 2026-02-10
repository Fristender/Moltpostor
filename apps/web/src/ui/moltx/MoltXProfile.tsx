import React, { useEffect, useState } from "react";
import type { MoltXApi } from "@moltpostor/api";
import type { MoltXAgent, MoltXPost } from "@moltpostor/core";
import { MoltXPostCard } from "./MoltXPostCard";
import { useAppContext } from "../AppContext";
import { useMoltXLikes } from "./useMoltXLikes";

export function MoltXProfile(props: {
  api: MoltXApi;
  name: string;
  isAuthed: boolean;
  onOpenPost: (id: string) => void;
  onOpenUser: (name: string) => void;
}) {
  const { addToHistory, cacheContent, getCachedContent, markdownEnabled } = useAppContext();
  const { isLiked, setLiked } = useMoltXLikes();
  const [agent, setAgent] = useState<MoltXAgent | null>(null);
  const [posts, setPosts] = useState<MoltXPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCacheIndicator, setShowCacheIndicator] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let cacheIndicatorTimeout: ReturnType<typeof setTimeout> | null = null;
    let fetchCompleted = false;
    setError(null);
    setLoading(true);
    setShowCacheIndicator(false);

    // Try cache first
    const cached = getCachedContent("moltx", "user", props.name);
    if (cached) {
      setAgent(cached.agent as MoltXAgent);
      setPosts((cached.posts as MoltXPost[]) ?? []);
      setLoading(false);
      // Only show cache indicator after a delay (if fetch is slow)
      cacheIndicatorTimeout = setTimeout(() => {
        if (!cancelled && !fetchCompleted) setShowCacheIndicator(true);
      }, 1000);
    }

    (async () => {
      try {
        const [profileRes, feedRes] = await Promise.all([
          props.api.getAgentProfile(props.name),
          props.api.getSpectateFeed(props.name, { limit: 20 }),
        ]);
        fetchCompleted = true;
        if (cancelled) return;
        if (cacheIndicatorTimeout) {
          clearTimeout(cacheIndicatorTimeout);
          cacheIndicatorTimeout = null;
        }
        // Handle nested response structure
        const profileAny = profileRes as unknown as { data?: { agent?: MoltXAgent }; agent?: MoltXAgent };
        const agentData = profileAny.data?.agent ?? profileAny.agent ?? profileRes;
        const validAgent = agentData && (agentData as MoltXAgent).id ? agentData as MoltXAgent : null;
        
        const feedAny = feedRes as unknown as { data?: { posts?: MoltXPost[] }; posts?: MoltXPost[] };
        const feedData = feedAny.data?.posts ?? feedAny.posts ?? feedRes;
        const validPosts = Array.isArray(feedData) ? feedData : [];

        setAgent(validAgent);
        setPosts(validPosts);
        setShowCacheIndicator(false);

        // Cache the content
        if (validAgent) {
          cacheContent({
            id: props.name,
            platform: "moltx",
            type: "user",
            data: { agent: validAgent, posts: validPosts },
          });
        }
      } catch (e: unknown) {
        fetchCompleted = true;
        if (cancelled) return;
        if (!getCachedContent("moltx", "user", props.name)) {
          setError(e instanceof Error ? e.message : String(e));
        } else {
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
  }, [props.api, props.name, cacheContent, getCachedContent]);

  // Track in watch history when profile is loaded
  useEffect(() => {
    if (!agent) return;
    addToHistory({
      id: props.name,
      platform: "moltx",
      type: "user",
      content: agent.description ?? "",
      author: agent.name ?? props.name,
    });
  }, [agent, props.name, addToHistory]);

  const handleFollow = async () => {
    if (followLoading) return;
    setFollowLoading(true);
    try {
      if (following) {
        await props.api.unfollowAgent(props.name);
        setFollowing(false);
        setAgent((a) => a ? { ...a, follower_count: Math.max(0, (a.follower_count ?? 0) - 1) } : a);
      } else {
        await props.api.followAgent(props.name);
        setFollowing(true);
        setAgent((a) => a ? { ...a, follower_count: (a.follower_count ?? 0) + 1 } : a);
      }
    } catch (e) {
      console.error("Follow action failed:", e);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleLike = async (postId: string, liked: boolean) => {
    try {
      if (liked) {
        await props.api.unlikePost(postId);
        setLiked(postId, false);
      } else {
        await props.api.likePost(postId);
        setLiked(postId, true);
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

  if (loading && !agent) return <div>Loading...</div>;
  if (error && !agent) return <div style={{ color: "crimson" }}>{error}</div>;
  if (!agent) return <div>Agent not found.</div>;

  const avatar = agent.avatar_emoji ?? agent.avatar_url ?? null;
  const displayName = agent.display_name ?? agent.name ?? props.name;

  return (
    <section>
      {showCacheIndicator && (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8, fontStyle: "italic" }}>
          Showing cached version
        </div>
      )}
      {agent.banner_url && (
        <div style={{ marginBottom: 16 }}>
          <img src={agent.banner_url} alt="Banner" style={{ width: "100%", maxHeight: 200, objectFit: "cover", borderRadius: 8 }} />
        </div>
      )}

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
        <div style={{ fontSize: 48 }}>
          {avatar && (avatar.startsWith("http") ? <img src={avatar} alt="" style={{ width: 64, height: 64, borderRadius: "50%" }} /> : avatar)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0 }}>{displayName}</h2>
            {agent.claim_status === "claimed" && <span title="Verified" style={{ color: "#1da1f2" }}>✓</span>}
          </div>
          <div style={{ opacity: 0.6 }}>@{agent.name ?? props.name}</div>
          {agent.description && <p style={{ marginTop: 8 }}>{agent.description}</p>}
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 14 }}>
            <span><strong>{agent.following_count ?? 0}</strong> Following</span>
            <span><strong>{agent.follower_count ?? 0}</strong> Followers</span>
            <span><strong>{agent.post_count ?? 0}</strong> Posts</span>
          </div>
        </div>
        {props.isAuthed && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            style={{
              padding: "8px 16px",
              fontWeight: 600,
              background: following ? "transparent" : "var(--color-bg-accent)",
              border: "1px solid var(--color-border)",
              borderRadius: 6,
            }}
          >
            {followLoading ? "..." : following ? "Unfollow" : "Follow"}
          </button>
        )}
      </div>

      {agent.evm_address && (
        <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 16 }}>
          Wallet: {agent.evm_address.slice(0, 6)}...{agent.evm_address.slice(-4)}
        </div>
      )}

      <h3>Posts</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {posts.map((p) => (
          <MoltXPostCard
            key={p.id}
            post={p}
            onOpenPost={props.onOpenPost}
            onOpenUser={props.onOpenUser}
            onLike={props.isAuthed ? handleLike : undefined}
            isLikedOverride={isLiked(p.id)}
            markdownEnabled={markdownEnabled}
          />
        ))}
        {posts.length === 0 && <div style={{ opacity: 0.7 }}>No posts yet.</div>}
      </div>
    </section>
  );
}
