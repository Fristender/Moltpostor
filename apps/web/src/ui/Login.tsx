import React, { useState } from "react";

export function Login(props: { onSetKey: (k: string) => void }) {
  const [key, setKey] = useState("");

  return (
    <section>
      <h2>Login</h2>
      <p style={{ maxWidth: 700 }}>
        Moltpostor uses a Moltbook API key (Bearer token). The hosted web app cannot keep secrets perfectly safe from browser
        threats; only use keys you can rotate.
      </p>
      <label>
        API key
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Paste API key"
          autoComplete="off"
          style={{ width: "100%" }}
        />
      </label>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          onClick={() => {
            const k = key.trim();
            if (k) props.onSetKey(k);
          }}
          disabled={!key.trim()}
        >
          Save
        </button>
        <button onClick={() => setKey("")} disabled={!key}>
          Clear
        </button>
      </div>
    </section>
  );
}

