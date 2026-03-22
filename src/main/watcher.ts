import fs from 'node:fs'
import { BrowserWindow } from 'electron'

let watcher: fs.FSWatcher | null = null
const debounceTimers: Record<string, ReturnType<typeof setTimeout>> = {}

// Timestamps of files written by the app itself — used to suppress
// self-triggered watch events (auto-save firing back as an external change)
const selfWriteTimes: Record<string, number> = {}
const SELF_WRITE_GRACE_MS = 2000

export function recordSelfWrite(filename: string): void {
  selfWriteTimes[filename] = Date.now()
}

export function startWatching(projectDir: string, win: BrowserWindow): void {
  stopWatching()

  try {
    watcher = fs.watch(projectDir, { persistent: false }, (eventType, filename) => {
      if (!filename) return
      if (eventType !== 'change' && eventType !== 'rename') return

      // Suppress events caused by the app's own writes
      const lastSelf = selfWriteTimes[filename] ?? 0
      if (Date.now() - lastSelf < SELF_WRITE_GRACE_MS) return

      // Debounce per filename to avoid duplicate rapid events (OneDrive
      // sometimes fires multiple events per sync cycle)
      if (debounceTimers[filename]) clearTimeout(debounceTimers[filename])
      debounceTimers[filename] = setTimeout(() => {
        delete debounceTimers[filename]

        if (!win.isDestroyed()) {
          if (filename === 'project.json') {
            win.webContents.send('watch:manifest-changed')
          } else if (filename.endsWith('.md')) {
            win.webContents.send('watch:file-changed', filename)
          }
        }
      }, 1200)
    })

    watcher.on('error', () => { /* silently ignore — e.g. dir removed */ })
  } catch {
    // Watching unavailable on this path (network drive, permissions, etc.)
  }
}

export function stopWatching(): void {
  if (watcher) {
    watcher.close()
    watcher = null
  }
  for (const t of Object.values(debounceTimers)) clearTimeout(t)
  for (const k of Object.keys(debounceTimers)) delete debounceTimers[k]
}
