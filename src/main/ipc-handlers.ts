import { ipcMain, dialog, BrowserWindow, shell } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import * as fileSystem from './file-system'
import { addRecent, loadRecents } from './recents'
import { buildAndSetMenu } from './menu'
import { exportToPdf, exportToDocx, type ExportManifest } from './exporter'
import { startWatching, recordSelfWrite } from './watcher'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nspell = require('nspell')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const dict = require('dictionary-en-us')

let spell: { correct: (w: string) => boolean; suggest: (w: string) => string[] } | null = null
dict((err: Error, d: { aff: Buffer; dic: Buffer }) => {
  if (!err) spell = nspell(d)
})

export function registerIpcHandlers(win: BrowserWindow): void {
  ipcMain.handle('recents:get', async () => {
    return loadRecents()
  })

  ipcMain.handle('recents:add', async (_event, { projectDir, title }: { projectDir: string; title: string }) => {
    const updated = await addRecent(projectDir, title)
    buildAndSetMenu(win, updated)
    return updated
  })

  ipcMain.handle('project:open-path', async (_event, { projectDir }: { projectDir: string }) => {
    try {
      const manifest = await fileSystem.readManifest(projectDir)
      startWatching(projectDir, win)
      return { projectDir, manifest }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('project:new', async (_event, { title }: { title: string }) => {
    try {
      const result = await dialog.showOpenDialog(win, {
        title: 'Choose folder for new project',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || !result.filePaths[0]) return null

      const folderName = title.trim().replace(/[\\/:*?"<>|]/g, '').trim() || 'New Project'
      const projectDir = path.join(result.filePaths[0], folderName)
      const alreadyExists = await fileSystem.fileExists(projectDir, 'project.json')
      if (alreadyExists) return { error: `A project named "${folderName}" already exists in that folder.` }
      await fs.mkdir(projectDir, { recursive: true })
      const manifest: fileSystem.ProjectManifest = { title, files: [] }
      recordSelfWrite('project.json')
      await fileSystem.writeManifest(projectDir, manifest)
      startWatching(projectDir, win)
      return { projectDir, manifest }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle('project:open', async (_event) => {
    try {
      const result = await dialog.showOpenDialog(win, {
        title: 'Open Project Folder',
        properties: ['openDirectory']
      })
      if (result.canceled || !result.filePaths[0]) return null

      const projectDir = result.filePaths[0]
      const hasProject = await fileSystem.fileExists(projectDir, 'project.json')
      if (!hasProject) return { error: 'No project found in that folder. Please select a VintyWrite project folder.' }
      const manifest = await fileSystem.readManifest(projectDir)
      startWatching(projectDir, win)
      return { projectDir, manifest }
    } catch (err) {
      return { error: (err as Error).message }
    }
  })

  ipcMain.handle(
    'project:save-manifest',
    async (_event, { projectDir, manifest }: { projectDir: string; manifest: fileSystem.ProjectManifest }) => {
      try {
        recordSelfWrite('project.json')
        await fileSystem.writeManifest(projectDir, manifest)
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'file:read',
    async (_event, { projectDir, filename }: { projectDir: string; filename: string }) => {
      try {
        const content = await fileSystem.readMarkdownFile(projectDir, filename)
        return { content }
      } catch (err) {
        return { content: '', error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'file:write',
    async (
      _event,
      { projectDir, filename, content }: { projectDir: string; filename: string; content: string }
    ) => {
      try {
        recordSelfWrite(path.basename(filename))
        await fileSystem.writeMarkdownFile(projectDir, filename, content)
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'file:create',
    async (_event, { projectDir, filename }: { projectDir: string; filename: string }) => {
      try {
        // if file exists already, skip creation (append number handled in renderer)
        const exists = await fileSystem.fileExists(projectDir, filename)
        if (!exists) {
          await fileSystem.createMarkdownFile(projectDir, filename)
        }
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle(
    'file:delete',
    async (_event, { projectDir, filename }: { projectDir: string; filename: string }) => {
      try {
        await fileSystem.deleteMarkdownFile(projectDir, filename)
        return { success: true }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )

  ipcMain.handle('dialog:ensure-dir', async (_event, { dirPath }: { dirPath: string }) => {
    try {
      await fs.mkdir(dirPath, { recursive: true })
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('shell:open-external', async (_event, { url }: { url: string }) => {
    await shell.openExternal(url)
  })

  ipcMain.handle('spell:check', (_event, { word }: { word: string }) => {
    if (!spell) return { misspelled: false, suggestions: [] }
    const misspelled = !spell.correct(word)
    return { misspelled, suggestions: misspelled ? spell.suggest(word).slice(0, 6) : [] }
  })

  ipcMain.handle(
    'export:book',
    async (
      _event,
      {
        format,
        manifest,
        fileContents
      }: {
        format: 'pdf' | 'docx'
        manifest: ExportManifest
        fileContents: Record<string, string>
      }
    ) => {
      try {
        const ext = format === 'pdf' ? 'pdf' : 'docx'
        const filters =
          format === 'pdf'
            ? [{ name: 'PDF Document', extensions: ['pdf'] }]
            : [{ name: 'Word Document', extensions: ['docx'] }]

        const { filePath, canceled } = await dialog.showSaveDialog(win, {
          title: `Export as ${ext.toUpperCase()}`,
          defaultPath: `${manifest.title}.${ext}`,
          filters
        })

        if (canceled || !filePath) return { success: false, canceled: true }

        if (format === 'pdf') {
          await exportToPdf(manifest, fileContents, filePath)
        } else {
          await exportToDocx(manifest, fileContents, filePath)
        }

        return { success: true, filePath }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )
}
