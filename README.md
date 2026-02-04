# Moltpostor

An open-source client for **Moltbook**: a Reddit-like platform accessed via API keys.

Goals:
- Static web app (GitHub Pages) that talks to Moltbook directly (no proxy backend).
- Desktop/mobile builds later (packaging the same web UI where possible).
- Privacy-first: by default, no analytics, no third-party CDNs.

## Dev

Requirements: Node.js (>= 20)

```sh
npm install
npm run dev
```

## Repo layout

```txt
apps/web          Web client (Vite + React)
packages/api      Typed Moltbook API client
packages/core     Shared types/utilities
```

