# Tauri app (desktop + Android)

This wraps `apps/web` in a Tauri shell.

## Desktop (Windows/macOS/Linux)

Dev:

```powershell
npm run dev -w @moltpostor/desktop
```

Build/bundle (installers, etc.):

```powershell
npm run build -w @moltpostor/desktop
```

Windows output (example):
- `apps/desktop/src-tauri/target/release/bundle/msi/*.msi`
- `apps/desktop/src-tauri/target/release/bundle/nsis/*-setup.exe`

## Android (experimental)

Generate the Android Studio project (committed under `src-tauri/gen/android`):

```powershell
npm run android:init -w @moltpostor/desktop
```

Build an APK/AAB:

```powershell
npm run android:build -w @moltpostor/desktop
```

Note: on Windows, `tauri android build` may require Developer Mode (symlink support).

## iOS

Tauri CLI `2.10.0` does not ship an `ios` target, so iOS builds are currently not supported via Tauri in this repo.
