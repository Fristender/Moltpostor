import React, { useEffect, useState } from "react";
import type { MoltXApi } from "@moltpostor/api";
import type { MoltXAgent, MoltXStatsResponse } from "@moltpostor/core";

type Metric = "followers" | "views" | "engagement";

export function MoltXLeaderboard(props: {
  api: MoltXApi;
  onOpenUser: (name: string) => void;
}) {
  const [agents, setAgents] = useState<MoltXAgent[]>([]);
  const [stats, setStats] = useState<MoltXStatsResponse["data"] | null>(null);
  const [metric, setMetric] = useState<Metric>("followers");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const [leaderboardRes, statsRes] = await Promise.all([
          props.api.getLeaderboard({ metric, limit: 50 }),
          props.api.getStats(),
        ]);
        if (cancelled) return;
        setAgents(leaderboardRes.data ?? leaderboardRes.agents ?? []);
        setStats(statsRes.data ?? null);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [props.api, metric]);

  return (
    <section>
      <h2>Leaderboard</h2>

      {stats && (
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ padding: 12, border: "1px solid var(--color-border)", borderRadius: 8, minWidth: 100 }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_agents?.toLocaleString() ?? "?"}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Agents</div>
          </div>
          <div style={{ padding: 12, border: "1px solid var(--color-border)", borderRadius: 8, minWidth: 100 }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_posts?.toLocaleString() ?? "?"}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Posts</div>
          </div>
          <div style={{ padding: 12, border: "1px solid var(--color-border)", borderRadius: 8, minWidth: 100 }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_likes?.toLocaleString() ?? "?"}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Likes</div>
          </div>
          <div style={{ padding: 12, border: "1px solid var(--color-border)", borderRadius: 8, minWidth: 100 }}>
            <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_follows?.toLocaleString() ?? "?"}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>Follows</div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["followers", "views", "engagement"] as Metric[]).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            style={{
              fontWeight: metric === m ? 700 : 400,
              padding: "6px 12px",
              borderRadius: 6,
              background: metric === m ? "var(--color-bg-accent)" : "transparent",
              border: "1px solid var(--color-border)",
              textTransform: "capitalize",
            }}
          >
            {m}
          </button>
        ))}
      </div>

      {error && <div style={{ color: "crimson", marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ opacity: 0.7, marginBottom: 12 }}>Loading...</div>}

      <div style={{ display: "grid", gap: 8 }}>
        {agents.map((a, i) => (
          <article
            key={a.name}
            onClick={() => props.onOpenUser(a.name)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 12,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            <div style={{ width: 32, textAlign: "center", fontWeight: 700, fontSize: 18, opacity: 0.6 }}>
              {i + 1}
            </div>
            {a.avatar_emoji && <span style={{ fontSize: 24 }}>{a.avatar_emoji}</span>}
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontWeight: 600 }}>{a.display_name ?? a.name}</span>
                {a.claim_status === "claimed" && <span title="Verified" style={{ color: "#1da1f2" }}>✓</span>}
              </div>
              <div style={{ fontSize: 13, opacity: 0.6 }}>@{a.name}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 600 }}>{a.follower_count?.toLocaleString() ?? 0}</div>
              <div style={{ fontSize: 12, opacity: 0.6 }}>followers</div>
            </div>
          </article>
        ))}
        {!loading && agents.length === 0 && <div style={{ opacity: 0.7 }}>No agents found.</div>}
      </div>
    </section>
  );
}
