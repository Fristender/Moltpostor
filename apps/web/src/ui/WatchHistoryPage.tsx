import React, { useState } from "react";
import { useAppContext } from "./AppContext";

function formatDate(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function WatchHistoryPage() {
  const { watchHistory, removeFromHistory, clearHistory } = useAppContext();
  const [filter, setFilter] = useState<"all" | "post" | "user" | "submolt">("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = filter === "all" ? watchHistory : watchHistory.filter(i => i.type === filter);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Watch History</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} style={{ padding: "4px 8px" }}>
            <option value="all">All ({watchHistory.length})</option>
            <option value="post">Posts ({watchHistory.filter(i => i.type === "post").length})</option>
            <option value="user">Users ({watchHistory.filter(i => i.type === "user").length})</option>
            <option value="submolt">Submolts ({watchHistory.filter(i => i.type === "submolt").length})</option>
          </select>
          {confirmClear ? (
            <span style={{ display: "flex", gap: 4 }}>
              <button onClick={() => { clearHistory(); setConfirmClear(false); }} style={{ color: "crimson" }}>
                Confirm Clear
              </button>
              <button onClick={() => setConfirmClear(false)}>Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmClear(true)} disabled={watchHistory.length === 0}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ opacity: 0.7 }}>
          {watchHistory.length === 0
            ? "No watch history yet. Content you view will appear here."
            : "No items match the current filter."}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtered.map((item) => (
            <article
              key={`${item.platform}-${item.type}-${item.id}`}
              style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: 12 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: item.type === "post"
                          ? "var(--color-bg-accent)"
                          : item.type === "user"
                          ? "var(--color-bg-accent-alt)"
                          : "var(--color-bg-hover)",
                        flexShrink: 0,
                      }}
                    >
                      {item.type}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>{item.platform}</span>
                  </div>
                  
                  {item.type === "post" && (
                    <>
                      {item.title && (
                        <a
                          href={`#/post/${encodeURIComponent(item.id)}`}
                          style={{ fontWeight: 600, display: "block", marginBottom: 4 }}
                        >
                          {item.title}
                        </a>
                      )}
                      {item.content && (
                        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>
                          {item.content.length > 150 ? item.content.slice(0, 150) + "..." : item.content}
                        </div>
                      )}
                    </>
                  )}
                  
                  {item.type === "user" && (
                    <a href={`#/u/${encodeURIComponent(item.name ?? item.id)}`} style={{ fontWeight: 600 }}>
                      u/{item.name ?? item.id}
                    </a>
                  )}
                  
                  {item.type === "submolt" && (
                    <>
                      <a href={`#/m/${encodeURIComponent(item.name ?? item.id)}`} style={{ fontWeight: 600 }}>
                        m/{item.name ?? item.id}
                      </a>
                      {item.title && (
                        <span style={{ opacity: 0.7, marginLeft: 8 }}>({item.title})</span>
                      )}
                    </>
                  )}
                  
                  <div style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>
                    {item.author && <span>by u/{item.author} - </span>}
                    {formatDate(item.viewedAt)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                  {item.type === "post" && (
                    <a href={`#/post/${encodeURIComponent(item.id)}`} style={{ fontSize: 12 }}>
                      Open
                    </a>
                  )}
                  {item.type === "user" && (
                    <a href={`#/u/${encodeURIComponent(item.name ?? item.id)}`} style={{ fontSize: 12 }}>
                      Open
                    </a>
                  )}
                  {item.type === "submolt" && (
                    <a href={`#/m/${encodeURIComponent(item.name ?? item.id)}`} style={{ fontSize: 12 }}>
                      Open
                    </a>
                  )}
                  <button
                    onClick={() => removeFromHistory(item.platform, item.type, item.id)}
                    style={{ fontSize: 11, opacity: 0.7 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
