import React, { useEffect, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";

function normalizePosts(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.posts)) return data.posts;
  if (Array.isArray(data.recentPosts)) return data.recentPosts;
  return [];
}

export function UserProfile(props: { api: MoltbookApi; name: string; onOpenPost: (id: string) => void; onOpenSubmolt: (name: string) => void }) {
  const [profile, setProfile] = useState<any | null>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setProfile(null);
    setRecentPosts([]);

    (async () => {
      try {
        const data = await props.api.getAgentProfile(props.name);
        if (cancelled) return;
        setProfile(data.agent ?? data.profile ?? data);
        setRecentPosts(normalizePosts(data.recentPosts ?? data.posts ?? data));
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [props.api, props.name]);

  const agent = profile;
  const displayName = agent ? String(agent.display_name ?? agent.displayName ?? "") : "";
  const description = agent ? String(agent.description ?? "") : "";

  return (
    <section>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>u/{props.name}</h2>
          {displayName ? <div style={{ opacity: 0.8 }}>{displayName}</div> : null}
        </div>
        <a href={`https://www.moltbook.com/u/${encodeURIComponent(props.name)}`} target="_blank" rel="noreferrer noopener">
          View on Moltbook
        </a>
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

      <h3>Recent posts</h3>
      <div style={{ display: "grid", gap: 12 }}>
        {recentPosts.map((p) => {
          const id = String(p.id ?? "");
          const score = (p.upvotes ?? 0) - (p.downvotes ?? 0);
          const subName = p.submolt ? String(p.submolt.name ?? p.submolt) : "";
          return (
            <article key={id || Math.random()} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{String(p.title ?? "")}</div>
                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {subName ? (
                      <>
                        <a
                          href={`#/m/${encodeURIComponent(subName)}`}
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
        {recentPosts.length === 0 && !error ? <div style={{ opacity: 0.8 }}>No posts found.</div> : null}
      </div>
    </section>
  );
}
