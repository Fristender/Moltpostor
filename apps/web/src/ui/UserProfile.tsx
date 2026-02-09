import React, { useEffect, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";
import type { MoltbookAgent, MoltbookPost, MoltbookComment, MoltbookAgentResponse } from "@moltpostor/core";
import { isAgentPinned, pinAgent, unpinAgent, isFollowing as isFollowingStored, setFollowing as setFollowingStored, detectFollowStatus } from "./pins";
import { useAppContext } from "./AppContext";
import { ContentRenderer } from "./ContentRenderer";

function normalizePosts(data: MoltbookAgentResponse | MoltbookPost[] | null): MoltbookPost[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.posts)) return data.posts;
  if (Array.isArray(data.recentPosts)) return data.recentPosts;
  return [];
}

function normalizeComments(data: MoltbookAgentResponse | MoltbookComment[] | null): MoltbookComment[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.comments)) return data.comments;
  if (Array.isArray(data.recentComments)) return data.recentComments;
  return [];
}

export function UserProfile(props: { api: MoltbookApi; name: string; onOpenPost: (id: string) => void; onOpenSubmolt: (name: string) => void }) {
  const { addToHistory, cacheContent, getCachedContent, markdownEnabled } = useAppContext();
  const [profile, setProfile] = useState<MoltbookAgent | null>(null);
  const [recentPosts, setRecentPosts] = useState<MoltbookPost[]>([]);
  const [recentComments, setRecentComments] = useState<MoltbookComment[]>([]);
  const [activeTab, setActiveTab] = useState<"posts" | "comments">("posts");
  const [error, setError] = useState<string | null>(null);
  const [usingCache, setUsingCache] = useState(false);
  const [following, setFollowing] = useState(() => isFollowingStored(props.name));
  const [followBusy, setFollowBusy] = useState(false);
  const [pinned, setPinned] = useState(() => isAgentPinned(props.name));

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setProfile(null);
    setRecentPosts([]);
    setRecentComments([]);
    setUsingCache(false);
    setPinned(isAgentPinned(props.name));
    setFollowing(isFollowingStored(props.name));

    (async () => {
      try {
        const data = await props.api.getAgentProfile(props.name);
        if (cancelled) return;
        detectFollowStatus(data, props.name);
        setFollowing(isFollowingStored(props.name));
        const profileData = (data.agent ?? data.profile ?? data) as MoltbookAgent;
        const postsData = normalizePosts(data);
        const commentsData = normalizeComments(data);
        setProfile(profileData);
        setRecentPosts(postsData);
        setRecentComments(commentsData);
        // Cache for offline access
        cacheContent({
          id: props.name,
          platform: "moltbook",
          type: "user",
          data: { profile: profileData, recentPosts: postsData, recentComments: commentsData },
        });
      } catch (e: unknown) {
        if (cancelled) return;
        // Try to load from cache
        const cached = getCachedContent("moltbook", "user", props.name);
        if (cached) {
          setProfile(cached.profile as MoltbookAgent);
          setRecentPosts((cached.recentPosts as MoltbookPost[]) ?? []);
          setRecentComments((cached.recentComments as MoltbookComment[]) ?? []);
          setUsingCache(true);
          setError(null);
        } else {
          setError(e instanceof Error ? e.message : String(e));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.api, props.name]);

  // Track in watch history when profile is loaded
  useEffect(() => {
    if (!profile) return;
    addToHistory({
      id: props.name,
      platform: "moltbook",
      type: "user",
      name: props.name,
    });
  }, [profile, props.name, addToHistory]);

  const handleFollow = async () => {
    setFollowBusy(true);
    try {
      if (following) {
        const res = await props.api.unfollowAgent(props.name);
        const isNowFollowing = res?.action === "none";
        setFollowingStored(props.name, isNowFollowing);
        setFollowing(isNowFollowing);
      } else {
        const res = await props.api.followAgent(props.name);
        const isNowFollowing = res?.action !== "unfollowed";
        setFollowingStored(props.name, isNowFollowing);
        setFollowing(isNowFollowing);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setFollowBusy(false);
    }
  };

  const handlePin = () => {
    if (pinned) {
      unpinAgent(props.name);
      setPinned(false);
    } else {
      pinAgent(props.name);
      setPinned(true);
    }
  };

  const agent = profile;
  const displayName = agent ? String(agent.display_name ?? agent.displayName ?? "") : "";
  const description = agent ? String(agent.description ?? "") : "";

  return (
    <section>
      {usingCache && (
        <div style={{ padding: "8px 12px", marginBottom: 12, background: "var(--color-bg-accent)", borderRadius: 6, fontSize: 13 }}>
          Showing cached version (offline)
        </div>
      )}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>u/{props.name}</h2>
          {displayName ? <div style={{ opacity: 0.8 }}>{displayName}</div> : null}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={handleFollow} disabled={followBusy}>
            {following ? "Unfollow" : "Follow"}
          </button>
          <button onClick={handlePin}>
            {pinned ? "Unpin" : "Pin"}
          </button>
          <a href={`https://www.moltbook.com/u/${encodeURIComponent(props.name)}`} target="_blank" rel="noreferrer noopener">
            View on Moltbook
          </a>
        </div>
      </div>

      {description ? <p style={{ opacity: 0.9 }}>{description}</p> : null}
      {error && <div style={{ color: "crimson" }}>{error}</div>}

      {agent ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, opacity: 0.8, marginTop: 8 }}>
          {"karma" in agent ? <div>Karma: {String(agent.karma ?? "")}</div> : null}
          {"follower_count" in agent || "followerCount" in agent ? <div>Followers: {String(agent.follower_count ?? agent.followerCount ?? "")}</div> : null}
          {"following_count" in agent || "followingCount" in agent ? <div>Following: {String(agent.following_count ?? agent.followingCount ?? "")}</div> : null}
          {"created_at" in agent || "createdAt" in agent ? <div>Joined: {String(agent.created_at ?? agent.createdAt ?? "")}</div> : null}
        </div>
      ) : null}

      <hr />

      <div style={{ display: "flex", gap: 0, marginBottom: 16 }}>
        <button
          onClick={() => setActiveTab("posts")}
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderBottom: activeTab === "posts" ? "2px solid var(--color-primary, #0066cc)" : "1px solid #ddd",
            background: activeTab === "posts" ? "var(--color-bg-accent, #f5f5f5)" : "transparent",
            fontWeight: activeTab === "posts" ? 600 : 400,
            cursor: "pointer",
            borderRadius: "4px 0 0 0",
          }}
        >
          Posts
        </button>
        <button
          onClick={() => setActiveTab("comments")}
          style={{
            padding: "8px 16px",
            border: "1px solid #ddd",
            borderLeft: "none",
            borderBottom: activeTab === "comments" ? "2px solid var(--color-primary, #0066cc)" : "1px solid #ddd",
            background: activeTab === "comments" ? "var(--color-bg-accent, #f5f5f5)" : "transparent",
            fontWeight: activeTab === "comments" ? 600 : 400,
            cursor: "pointer",
            borderRadius: "0 4px 0 0",
          }}
        >
          Comments
        </button>
      </div>

      {activeTab === "posts" && (
        <>
          <h3>Recent posts</h3>
          <div style={{ display: "grid", gap: 12 }}>
            {recentPosts.map((p) => {
              const id = String(p.id ?? "");
              const score = (p.upvotes ?? 0) - (p.downvotes ?? 0);
              const subName = p.submolt ? (typeof p.submolt === "string" ? p.submolt : p.submolt.name ?? "") : "";
              return (
                <article key={id || Math.random()} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{String(p.title ?? "")}</div>
                      <div style={{ fontSize: 12, opacity: 0.75 }}>
                        {subName ? (
                          <>
                            <a
                              href={`#/moltbook/m/${encodeURIComponent(subName)}`}
                              onClick={(e) => {
                                e.preventDefault();
                                props.onOpenSubmolt(subName);
                              }}
                            >
                              m/{subName}
                            </a>
                            {" - "}
                          </>
                        ) : null}
                        {p.created_at ? String(p.created_at) : ""}
                      </div>
                    </div>
                    <div style={{ minWidth: 80, textAlign: "right" }}>Score: {score}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => props.onOpenPost(id)} disabled={!id}>
                      Open
                    </button>
                    {p.url && (
                      <a href={String(p.url)} target="_blank" rel="noreferrer noopener">
                        Link
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
            {!profile && !error ? <div style={{ opacity: 0.8 }}>Loading...</div> : null}
            {recentPosts.length === 0 && profile && !error ? <div style={{ opacity: 0.8 }}>No posts found.</div> : null}
          </div>
        </>
      )}

      {activeTab === "comments" && (
        <>
          <h3>Recent comments</h3>
          {recentComments.length > 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              {recentComments.map((c) => {
                const id = String(c.id ?? "");
                const postId = String(c.post?.id ?? c.post_id ?? c.postId ?? "");
                const postTitle = String(c.post?.title ?? c.post_title ?? c.postTitle ?? "");
                const content = String(c.content ?? c.body ?? "");
                const score = (c.upvotes ?? 0) - (c.downvotes ?? 0);
                return (
                  <article key={id || Math.random()} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
                    {postTitle && postId && (
                      <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 4 }}>
                        on:{" "}
                        <a
                          href={`#/post/${encodeURIComponent(postId)}`}
                          onClick={(e) => {
                            e.preventDefault();
                            props.onOpenPost(postId);
                          }}
                          style={{ fontWeight: 500 }}
                        >
                          {postTitle}
                        </a>
                      </div>
                    )}
                    <div style={{ fontSize: 14 }}>
                      <ContentRenderer content={content} platform="moltbook" markdownEnabled={markdownEnabled} />
                    </div>
                    <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                      <span>Score: {score}</span>
                      {c.created_at && <span>{String(c.created_at)}</span>}
                    </div>
                    {postId && (
                      <div style={{ marginTop: 8 }}>
                        <button onClick={() => props.onOpenPost(postId)} style={{ fontSize: 12 }}>
                          View Post
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: 32, opacity: 0.7 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
              <div>Comments coming soon</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>The API does not yet support fetching user comments.</div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
