import React, { useEffect, useState } from "react";
import { HttpError, type MoltbookApi } from "@moltpostor/api";
import type { MoltbookSubmolt, MoltbookSubmoltsResponse } from "@moltpostor/core";

function normalizeSubmolts(data: MoltbookSubmoltsResponse | MoltbookSubmolt[] | null): MoltbookSubmolt[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.submolts)) return data.submolts;
  return [];
}

function createErrorMessage(e: unknown): string {
  if (e instanceof HttpError) {
    if (e.status === 401 || e.status === 403) return `Not authorized (HTTP ${e.status}). Import an API key first.`;
    if (e.status === 409) return `That submolt name is already taken (HTTP 409).`;
    if (e.status === 400) return `Invalid submolt fields (HTTP 400). Name, display name, and description are required.`;
    return `Create failed (HTTP ${e.status}). ${e.bodyText || ""}`.trim();
  }
  return (e instanceof Error ? e.message : String(e)) || "Create failed.";
}

export function Submolts(props: { api: MoltbookApi; isAuthed: boolean; onOpenSubmolt: (name: string) => void }) {
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MoltbookSubmolt[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    let cancelled = false;
    setError(null);
    (async () => {
      try {
        const data = await props.api.listSubmolts(page);
        if (cancelled) return;
        setItems(normalizeSubmolts(data));
      } catch (e: unknown) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
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

      <details style={{ marginBottom: 12 }} open={false}>
        <summary style={{ cursor: props.isAuthed ? "pointer" : "not-allowed", opacity: props.isAuthed ? 1 : 0.6 }}>
          Create submolt
        </summary>
        {!props.isAuthed ? (
          <div style={{ marginTop: 8, opacity: 0.8 }}>Import an API key to create submolts.</div>
        ) : (
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {createError && <div style={{ color: "crimson" }}>{createError}</div>}
            <label>
              Name (required)
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="aithoughts"
                style={{ width: "100%" }}
                disabled={busy}
              />
            </label>
            <label>
              Display name (required)
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="AI Thoughts"
                style={{ width: "100%" }}
                disabled={busy}
              />
            </label>
            <label>
              Description (required)
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="A place for agents to share musings"
                style={{ width: "100%" }}
                disabled={busy}
              />
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={async () => {
                  setCreateError(null);
                  const n = name.trim();
                  const dn = displayName.trim();
                  const d = description.trim();
                  if (!n || !dn || !d) return;
                  setBusy(true);
                  try {
                    const payload = { name: n, display_name: dn, description: d };
                    await props.api.createSubmolt(payload);
                    setName("");
                    setDisplayName("");
                    setDescription("");
                    // Reload first page so the new submolt is visible.
                    setPage(1);
                    const data = await props.api.listSubmolts(1);
                    setItems(normalizeSubmolts(data));
                  } catch (e: unknown) {
                    setCreateError(createErrorMessage(e));
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy || !name.trim() || !displayName.trim() || !description.trim()}
              >
                Create
              </button>
              <button
                onClick={() => {
                  setName("");
                  setDisplayName("");
                  setDescription("");
                  setCreateError(null);
                }}
                disabled={busy || (!name && !displayName && !description)}
              >
                Clear
              </button>
            </div>
          </div>
        )}
      </details>

      <div style={{ display: "grid", gap: 12 }}>
        {items.map((s) => (
          <article key={String(s.name ?? "")} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
            <div style={{ fontWeight: 600 }}>
              <a href={`#/moltbook/m/${encodeURIComponent(String(s.name ?? ""))}`} onClick={(e) => {
                e.preventDefault();
                props.onOpenSubmolt(String(s.name ?? ""));
              }}>
                m/{String(s.name ?? "")}
              </a>
              {s.display_name ? <span style={{ marginLeft: 8, fontWeight: 400, opacity: 0.8 }}>({String(s.display_name)})</span> : null}
            </div>
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
