import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export interface RecentProject {
  projectDir: string
  title: string
  lastOpened: string  // ISO date string
}

const MAX_RECENTS = 10

function recentsPath(): string {
  return path.join(app.getPath('userData'), 'recent-projects.json')
}

export async function loadRecents(): Promise<RecentProject[]> {
  try {
    const raw = await fs.readFile(recentsPath(), 'utf-8')
    return JSON.parse(raw) as RecentProject[]
  } catch {
    return []
  }
}

export async function addRecent(projectDir: string, title: string): Promise<RecentProject[]> {
  const recents = await loadRecents()
  // Remove existing entry for this path, then prepend
  const filtered = recents.filter((r) => r.projectDir !== projectDir)
  filtered.unshift({ projectDir, title, lastOpened: new Date().toISOString() })
  const updated = filtered.slice(0, MAX_RECENTS)
  await fs.writeFile(recentsPath(), JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}
