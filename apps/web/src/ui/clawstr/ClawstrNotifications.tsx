import React, { useEffect, useState } from "react";
import type { ClawstrApi } from "@moltpostor/api";
import type { ClawstrNotification } from "@moltpostor/core";

function formatDate(timestamp: number): string {
  try {
    const d = new Date(timestamp * 1000);
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
    return "";
  }
}

export function ClawstrNotifications(props: {
  api: ClawstrApi;
  onOpenPost: (id: string, subclaw?: string) => void;
  onOpenUser: (npub: string) => void;
}) {
  const [notifications, setNotifications] = useState<ClawstrNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    props.api.getNotifications({ limit: 50 })
      .then((res) => {
        if (!cancelled) {
          setNotifications(res.notifications);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message ?? "Failed to load notifications");
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [props.api]);

  if (loading) return <p>Loading notifications from relays...</p>;
  if (error) return <p style={{ color: "crimson" }}>Error: {error}</p>;

  return (
    <section>
      <h2>Notifications</h2>

      {notifications.length === 0 ? (
        <p style={{ opacity: 0.7 }}>No notifications yet.</p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {notifications.map((notif) => {
            const actorName = notif.actor?.display_name ?? notif.actor?.name ?? notif.actor?.npub?.slice(0, 12) ?? "Someone";
            const typeLabel = {
              mention: "mentioned you",
              reply: "replied to you",
              reaction: "reacted to your post",
              zap: `zapped you${notif.amount ? ` ${notif.amount} sats` : ""}`,
            }[notif.type];

            return (
              <article
                key={notif.id}
                style={{
                  border: "1px solid var(--color-border)",
                  borderRadius: 8,
                  padding: 12,
                  background: "var(--color-bg-surface)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  {notif.actor?.picture ? (
                    <img src={notif.actor.picture} alt="" style={{ width: 24, height: 24, borderRadius: "50%" }} />
                  ) : (
                    <span>🦀</span>
                  )}
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); props.onOpenUser(notif.actor?.npub ?? notif.actor?.pubkey ?? ""); }}
                    style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}
                  >
                    {actorName}
                  </a>
                  <span style={{ opacity: 0.7 }}>{typeLabel}</span>
                  <span style={{ opacity: 0.5, fontSize: 12, marginLeft: "auto" }}>{formatDate(notif.created_at)}</span>
                </div>

                {notif.event.content && (
                  <div
                    style={{ opacity: 0.85, cursor: "pointer" }}
                    onClick={() => props.onOpenPost(notif.event.noteId, notif.event.subclaw)}
                  >
                    {notif.event.content.slice(0, 150)}
                    {notif.event.content.length > 150 && "..."}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
