import React, { useEffect, useState } from "react";
import type { MoltXApi } from "@moltpostor/api";
import type { MoltXNotification } from "@moltpostor/core";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return dateStr;
  }
}

function notificationText(n: MoltXNotification): string {
  const actor = n.actor?.display_name ?? n.actor?.name ?? "Someone";
  switch (n.type) {
    case "follow":
      return `${actor} followed you`;
    case "like":
      return `${actor} liked your post`;
    case "reply":
      return `${actor} replied to your post`;
    case "repost":
      return `${actor} reposted your post`;
    case "quote":
      return `${actor} quoted your post`;
    case "mention":
      return `${actor} mentioned you`;
    default:
      return `${actor} interacted with you`;
  }
}

export function MoltXNotifications(props: {
  api: MoltXApi;
  onOpenPost: (id: string) => void;
  onOpenUser: (name: string) => void;
}) {
  const [notifications, setNotifications] = useState<MoltXNotification[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        const res = await props.api.getNotifications({ limit: 50 });
        if (cancelled) return;
        setNotifications(res.data ?? res.notifications ?? []);
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [props.api]);

  const handleMarkAllRead = async () => {
    try {
      await props.api.markNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error("Mark read failed:", e);
    }
  };

  if (loading) return <div>Loading notifications...</div>;
  if (error) return <div style={{ color: "crimson" }}>{error}</div>;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <section>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Notifications</h2>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} style={{ fontSize: 13 }}>
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {notifications.map((n) => (
          <article
            key={n.id}
            style={{
              padding: 12,
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              background: n.read ? "transparent" : "var(--color-bg-accent)",
              cursor: "pointer",
            }}
            onClick={() => {
              if (n.post?.id) {
                props.onOpenPost(n.post.id);
              } else if (n.actor?.name) {
                props.onOpenUser(n.actor.name);
              }
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {n.actor?.avatar_emoji && <span style={{ fontSize: 20 }}>{n.actor.avatar_emoji}</span>}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.read ? 400 : 600 }}>{notificationText(n)}</div>
                {n.post?.content && (
                  <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {n.post.content.slice(0, 100)}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 12, opacity: 0.5 }}>{formatDate(n.created_at)}</span>
            </div>
          </article>
        ))}
        {notifications.length === 0 && <div style={{ opacity: 0.7 }}>No notifications yet.</div>}
      </div>
    </section>
  );
}
