import React, { useEffect, useState } from "react";
import type { MoltbookApi } from "@moltpostor/api";

function normalizeSubmolts(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.submolts)) return data.submolts;
  return [];
}

export function Submolts(props: { api: MoltbookApi }) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const data = await props.api.listSubmolts(page);
        if (cancelled) return;
        setItems(normalizeSubmolts(data));
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, props.api]);

  return (
    <section>
      <h2>Submolts</h2>
      {error && <div style={{ color: "crimson" }}>{error}</div>}
      <div style={{ display: "grid", gap: 12 }}>
        {items.map((s) => (
          <article key={String(s.name ?? "")} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600 }}>s/{String(s.name ?? "")}</div>
            <div style={{ fontSize: 12, opacity: 0.75 }}>{String(s.description ?? "")}</div>
          </article>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </button>
        <div>Page {page}</div>
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </section>
  );
}

