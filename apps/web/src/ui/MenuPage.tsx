import React from "react";

export function MenuPage(props: { onNavigate: (page: { kind: string }) => void }) {
  const entries: { label: string; description: string; page: { kind: string } }[] = [
    { label: "Settings", description: "Theme and app preferences", page: { kind: "settings" } },
    { label: "Watch History", description: "Content you've viewed across all platforms", page: { kind: "watch-history" } },
    { label: "Saved", description: "Posts and comments you've saved locally", page: { kind: "saved" } },
  ];

  return (
    <section>
      <h2>Menu</h2>
      <div style={{ display: "grid", gap: 12 }}>
        {entries.map((e) => (
          <button
            key={e.label}
            onClick={() => props.onNavigate(e.page)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 4,
              padding: 16,
              border: "1px solid #ddd",
              borderRadius: 8,
              background: "none",
              cursor: "pointer",
              textAlign: "left",
              width: "100%",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 600 }}>{e.label}</span>
            <span style={{ fontSize: 13, opacity: 0.7 }}>{e.description}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
