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

## Desktop / Android (Tauri)

The Tauri wrapper lives in `apps/desktop` and reuses the `apps/web` build output.

```sh
# desktop dev
npm run dev -w @moltpostor/desktop

# desktop build (bundles/installers)
npm run build -w @moltpostor/desktop
```

## Repo layout

```txt
apps/web          Web client (Vite + React)
apps/desktop      Tauri wrapper (desktop + Android)
packages/api      Typed Moltbook API client
packages/core     Shared types/utilities
```
