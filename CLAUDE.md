# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server with hot reload
npm run build      # Build all processes (main, preload, renderer)
npm run dist:win   # Build Windows NSIS installer
npm run dist:mac   # Build macOS DMG (x64 + arm64)
npm run dist:linux # Build Linux AppImage
```

There are no lint or test scripts configured.

## Architecture

VintyWrite is an **Electron + React + TypeScript** desktop app — a retro DOS-style markdown editor for book/manuscript writing.

### Process Model

Three separate TypeScript compilation targets:
- **Main process** (`src/main/`) — Node.js, file I/O, IPC handlers
- **Preload** (`src/preload/index.ts`) — Context-isolated IPC bridge, exposes `window.api` to renderer
- **Renderer** (`src/renderer/`) — React SPA, no direct Node.js access

Security: context isolation is enabled. All main-process operations go through the preload bridge. When adding new capabilities, define the channel in preload first.

### State Management

Single Zustand store at `src/renderer/src/store/useStore.ts` holds all app state: active project, file list, current file ID, content cache, dirty flag, view mode, and phosphor theme. Components read and mutate this store directly.

### IPC Flow

`src/main/ipc-handlers.ts` registers all `ipcMain` handlers. The preload bridge (`src/preload/index.ts`) exposes them as typed async functions on `window.api`. Renderer hooks (`src/renderer/src/hooks/`) call `window.api.*` and sync results into the Zustand store.

Menu events are also sent over IPC (the app menu in `src/main/menu.ts` emits to the renderer, which subscribes via `window.api.onMenuEvent`/`offMenuEvent`).

### Project Format

A project is a directory containing:
- `project.json` — manifest: `{ title: string, files: FileEntry[] }`
- `*.md` — one file per chapter

`FileEntry`: `{ id: string, filename: string, title: string }`

### File Watcher

`src/main/watcher.ts` uses `fs.watch()` with per-file debouncing. It suppresses events triggered by the app's own writes to avoid false reload cycles (important for OneDrive sync scenarios).

### Export

`src/main/exporter.ts` handles both DOCX (via `docx` library) and PDF (via Electron's `webContents.printToPDF`).

### Theming

Three phosphor CRT themes (green, amber, blue) defined via CSS variables in `src/renderer/src/styles/global.css`. The scanline/flicker overlay is in `src/renderer/src/styles/retro.css`.
