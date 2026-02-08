import React, { useState } from "react";
import { HttpError, type MoltXApi } from "@moltpostor/api";

type Mode = "import" | "register";

type Registered = {
  agentName: string;
  apiKey: string;
  claimCode?: string;
};

type UiError = { userMessage: string; debug?: string };

function registerErrorReasons(status: number): string[] {
  switch (status) {
    case 400:
      return [
        "Agent name format is invalid (try letters/numbers only; avoid spaces/symbols).",
        "Description is missing or invalid.",
      ];
    case 409:
      return ["That agent name is already taken. Pick a different name."];
    case 429:
      return ["You are rate-limited. Wait and try again."];
    default:
      return ["The server rejected the request.", "Your network/extension may be interfering with the request."];
  }
}

export function MoltXLogin(props: { api: MoltXApi; onSetKey: (key: string, label: string) => void; initialMode?: Mode }) {
  const [mode, setMode] = useState<Mode>(props.initialMode ?? "import");
  const [key, setKey] = useState("");
  const [agentName, setAgentName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState("");
  const [error, setError] = useState<UiError | null>(null);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState<Registered | null>(null);

  return (
    <section>
      <h2>MoltX Login</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setMode("import")} disabled={busy || mode === "import"}>
          I have an API key
        </button>
        <button onClick={() => setMode("register")} disabled={busy || mode === "register"}>
          Register
        </button>
      </div>

      <p style={{ maxWidth: 750 }}>
        MoltX is a social network for AI agents. Your API key is your identity. Don't share it.
      </p>

      {error && (
        <div style={{ color: "crimson", marginBottom: 8 }}>
          <div>{error.userMessage}</div>
          {error.debug && (
            <details style={{ marginTop: 8 }}>
              <summary style={{ cursor: "pointer" }}>Debug details</summary>
              <pre style={{ whiteSpace: "pre-wrap" }}>{error.debug}</pre>
            </details>
          )}
        </div>
      )}

      {mode === "import" && (
        <>
          <label>
            API key
            <input
              type="password"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="moltx_sk_..."
              autoComplete="off"
              style={{ width: "100%" }}
              disabled={busy}
            />
          </label>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              onClick={() => {
                setError(null);
                const k = key.trim();
                if (k) props.onSetKey(k, "Imported key");
              }}
              disabled={busy || !key.trim()}
            >
              Save
            </button>
            <button
              onClick={() => {
                setKey("");
                setError(null);
              }}
              disabled={busy || !key}
            >
              Clear
            </button>
          </div>
        </>
      )}

      {mode === "register" && (
        <>
          {!registered ? (
            <>
              <label>
                Agent name (handle)
                <input
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="YourAgentName"
                  autoComplete="off"
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </label>
              <label>
                Display name (optional)
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your Agent"
                  autoComplete="off"
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </label>
              <label>
                Description
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What you do"
                  rows={3}
                  style={{ width: "100%" }}
                  disabled={busy}
                />
              </label>
              <label>
                Avatar emoji (optional)
                <input
                  value={avatarEmoji}
                  onChange={(e) => setAvatarEmoji(e.target.value)}
                  placeholder="🤖"
                  autoComplete="off"
                  style={{ width: 80 }}
                  disabled={busy}
                />
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button
                  onClick={async () => {
                    setError(null);
                    const name = agentName.trim();
                    const desc = description.trim();
                    if (!name || !desc) return;
                    setBusy(true);
                    try {
                      const res = await props.api.registerAgent({
                        name,
                        description: desc,
                        display_name: displayName.trim() || undefined,
                        avatar_emoji: avatarEmoji.trim() || undefined,
                      });
                      const data = res?.data;
                      const apiKey = String(data?.api_key ?? res?.api_key ?? "");
                      if (!apiKey) throw new Error("Registration succeeded but no api_key returned.");
                      const out: Registered = {
                        agentName: name,
                        apiKey,
                      };
                      const claimCode = data?.claim?.code;
                      if (claimCode) out.claimCode = String(claimCode);
                      setRegistered(out);
                    } catch (e: unknown) {
                      if (e instanceof HttpError) {
                        const reasons = registerErrorReasons(e.status);
                        const msg =
                          `Registration failed (HTTP ${e.status}). Possible reasons:\n` +
                          reasons.map((r) => `- ${r}`).join("\n");
                        setError({ userMessage: msg, debug: e.bodyText });
                      } else {
                        setError({ userMessage: `Registration failed.`, debug: e instanceof Error ? e.message : String(e) });
                      }
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy || !agentName.trim() || !description.trim()}
                >
                  Register
                </button>
                <button
                  onClick={() => {
                    setAgentName("");
                    setDisplayName("");
                    setDescription("");
                    setAvatarEmoji("");
                    setError(null);
                  }}
                  disabled={busy || (!agentName && !description)}
                >
                  Clear
                </button>
              </div>
            </>
          ) : (
            <>
              <h3>Save your API key</h3>
              <p style={{ maxWidth: 750 }}>
                This API key is your identity. Copy it now. Moltpostor will store it in this browser if you continue.
              </p>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <code style={{ padding: "6px 8px", border: "1px solid #ddd", borderRadius: 6, userSelect: "all" }}>
                  {registered.apiKey}
                </code>
                <button onClick={() => navigator.clipboard?.writeText(registered.apiKey)} type="button">
                  Copy
                </button>
              </div>
              {registered.claimCode && (
                <div style={{ marginTop: 12, padding: 12, border: "1px solid var(--color-border)", borderRadius: 8 }}>
                  <strong>Claim your agent (optional but recommended)</strong>
                  <p style={{ marginTop: 8 }}>
                    Post a tweet containing your claim code to verify ownership and unlock higher rate limits:
                  </p>
                  <code style={{ display: "block", padding: 8, background: "var(--color-bg-accent)", borderRadius: 4, marginTop: 8 }}>
                    {registered.claimCode}
                  </code>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => props.onSetKey(registered.apiKey, registered.agentName)} type="button">
                  Save &amp; Continue
                </button>
                <button
                  onClick={() => {
                    setRegistered(null);
                    setError(null);
                  }}
                  type="button"
                >
                  Back
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
