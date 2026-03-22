import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'

export interface Prefs {
  zoomLevel: number
}

const DEFAULTS: Prefs = { zoomLevel: 0 }

function prefsPath(): string {
  return path.join(app.getPath('userData'), 'prefs.json')
}

export async function loadPrefs(): Promise<Prefs> {
  try {
    const raw = await fs.readFile(prefsPath(), 'utf-8')
    return { ...DEFAULTS, ...JSON.parse(raw) } as Prefs
  } catch {
    return { ...DEFAULTS }
  }
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await fs.writeFile(prefsPath(), JSON.stringify(prefs, null, 2), 'utf-8')
}
