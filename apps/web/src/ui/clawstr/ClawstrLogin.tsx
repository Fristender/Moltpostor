import React, { useState } from "react";
import type { ClawstrApi } from "@moltpostor/api";

export function ClawstrLogin(props: {
  api: ClawstrApi;
  onSetKey: (nsec: string, label: string) => void;
}) {
  const [mode, setMode] = useState<"import" | "generate">("import");
  const [nsecInput, setNsecInput] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generatedIdentity, setGeneratedIdentity] = useState<{ npub: string; nsec: string } | null>(null);

  const handleImport = () => {
    if (!nsecInput.trim()) {
      setError("Please enter your nsec or hex secret key");
      return;
    }
    try {
      const identity = props.api.importSecretKey(nsecInput.trim());
      props.onSetKey(identity.nsec!, label || "Imported key");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid secret key");
    }
  };

  const handleGenerate = () => {
    try {
      const identity = props.api.generateIdentity();
      setGeneratedIdentity({ npub: identity.npub, nsec: identity.nsec! });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate identity");
    }
  };

  const handleSaveGenerated = () => {
    if (!generatedIdentity) return;
    props.onSetKey(generatedIdentity.nsec, label || "Generated key");
  };

  return (
    <section>
      <h2>Clawstr Login</h2>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>
        Clawstr uses Nostr protocol. You need a Nostr secret key (nsec) to post and interact.
        Your key is stored locally in this browser only.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setMode("import")}
          style={{ fontWeight: mode === "import" ? 700 : 400 }}
        >
          Import Key
        </button>
        <button
          onClick={() => setMode("generate")}
          style={{ fontWeight: mode === "generate" ? 700 : 400 }}
        >
          Generate New
        </button>
      </div>

      {mode === "import" && (
        <div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Secret Key (nsec or hex)</label>
            <input
              type="password"
              value={nsecInput}
              onChange={(e) => setNsecInput(e.target.value)}
              placeholder="nsec1... or 64-char hex"
              style={{ width: "100%", maxWidth: 500, padding: 8, borderRadius: 6, border: "1px solid var(--color-border)" }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My Clawstr Key"
              style={{ width: "100%", maxWidth: 300, padding: 8, borderRadius: 6, border: "1px solid var(--color-border)" }}
            />
          </div>

          {error && <p style={{ color: "crimson", marginBottom: 16 }}>{error}</p>}

          <button onClick={handleImport}>Import Key</button>

          <div style={{ marginTop: 24, padding: 16, background: "var(--color-bg-accent)", borderRadius: 8 }}>
            <h4 style={{ margin: "0 0 8px 0" }}>Where to get a key?</h4>
            <p style={{ margin: 0, fontSize: 14 }}>
              If you have the Clawstr CLI installed, run: <code>npx -y @clawstr/cli@latest whoami</code> to see your key.
              Or use any Nostr client to generate one.
            </p>
          </div>
        </div>
      )}

      {mode === "generate" && !generatedIdentity && (
        <div>
          <p style={{ marginBottom: 16 }}>
            Generate a new Nostr identity. Make sure to backup your secret key - it cannot be recovered!
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600 }}>Label (optional)</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My New Identity"
              style={{ width: "100%", maxWidth: 300, padding: 8, borderRadius: 6, border: "1px solid var(--color-border)" }}
            />
          </div>

          {error && <p style={{ color: "crimson", marginBottom: 16 }}>{error}</p>}

          <button onClick={handleGenerate}>Generate Identity</button>
        </div>
      )}

      {mode === "generate" && generatedIdentity && (
        <div>
          <div style={{ padding: 16, background: "var(--color-bg-accent)", borderRadius: 8, marginBottom: 16 }}>
            <h4 style={{ margin: "0 0 12px 0" }}>Your New Identity</h4>
            
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>Public Key (npub) - safe to share</label>
              <code style={{ display: "block", padding: 8, background: "var(--color-bg-surface)", borderRadius: 4, wordBreak: "break-all", fontSize: 12 }}>
                {generatedIdentity.npub}
              </code>
            </div>

            <div>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4, color: "crimson" }}>
                Secret Key (nsec) - NEVER SHARE THIS!
              </label>
              <code style={{ display: "block", padding: 8, background: "var(--color-bg-surface)", borderRadius: 4, wordBreak: "break-all", fontSize: 12 }}>
                {generatedIdentity.nsec}
              </code>
            </div>
          </div>

          <div style={{ padding: 12, border: "2px solid crimson", borderRadius: 8, marginBottom: 16 }}>
            <strong>IMPORTANT:</strong> Copy and securely backup your secret key (nsec) now!
            If you lose it, you lose access to this identity forever.
          </div>

          <button onClick={handleSaveGenerated}>I've backed up my key - Continue</button>
        </div>
      )}
    </section>
  );
}
