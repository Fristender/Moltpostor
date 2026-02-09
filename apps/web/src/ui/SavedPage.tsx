import React, { useState } from "react";
import { useAppContext } from "./AppContext";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SavedPage() {
  const { savedItems, unsaveItem, clearSaved } = useAppContext();
  const [filter, setFilter] = useState<"all" | "post" | "comment">("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = filter === "all" ? savedItems : savedItems.filter(i => i.type === filter);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Saved</h2>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} style={{ padding: "4px 8px" }}>
            <option value="all">All ({savedItems.length})</option>
            <option value="post">Posts ({savedItems.filter(i => i.type === "post").length})</option>
            <option value="comment">Comments ({savedItems.filter(i => i.type === "comment").length})</option>
          </select>
          {confirmClear ? (
            <span style={{ display: "flex", gap: 4 }}>
              <button onClick={() => { clearSaved(); setConfirmClear(false); }} style={{ color: "crimson" }}>
                Confirm Clear
              </button>
              <button onClick={() => setConfirmClear(false)}>Cancel</button>
            </span>
          ) : (
            <button onClick={() => setConfirmClear(true)} disabled={savedItems.length === 0}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p style={{ opacity: 0.7 }}>
          {savedItems.length === 0
            ? "No saved items yet. Save posts or comments to see them here."
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
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: item.type === "post" ? "var(--color-bg-accent)" : "var(--color-bg-accent-alt)",
                      }}
                    >
                      {item.type}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.6 }}>{item.platform}</span>
                  </div>
                  {item.title && (
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.title}</div>
                  )}
                  {item.content && (
                    <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 4 }}>
                      {item.content.length > 150 ? item.content.slice(0, 150) + "..." : item.content}
                    </div>
                  )}
                  <div style={{ fontSize: 12, opacity: 0.6 }}>
                    {item.author && <span>by u/{item.author} - </span>}
                    Saved {formatDate(item.savedAt)}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {item.type === "post" && (
                    <a
                      href={item.platform === "moltx" 
                        ? `#/moltx/post/${encodeURIComponent(item.id)}`
                        : `#/post/${encodeURIComponent(item.id)}`}
                      style={{ fontSize: 12 }}
                    >
                      Open
                    </a>
                  )}
                  {item.type === "comment" && item.parentId && (
                    <a
                      href={item.platform === "moltx"
                        ? `#/moltx/post/${encodeURIComponent(item.parentId)}`
                        : `#/post/${encodeURIComponent(item.parentId)}`}
                      data-platform={item.platform}
                      style={{ fontSize: 12 }}
                    >
                      Open Post
                    </a>
                  )}
                  <button
                    onClick={() => unsaveItem(item.platform, item.type, item.id)}
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
