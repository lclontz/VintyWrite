import { useStore } from '../store/useStore'
import { useDialogStore } from '../components/Dialog/dialogStore'
import type { FileEntry } from '../types'
import { v4 as uuidv4 } from 'uuid'

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'untitled'
}

async function uniqueFilename(projectDir: string, base: string): Promise<string> {
  let filename = `${base}.md`
  let n = 2
  while (true) {
    const result = await window.api.readFile(projectDir, filename)
    // If error is returned the file doesn't exist — use this name
    if (result.error) return filename
    // File exists, try next number
    filename = `${base}-${n}.md`
    n++
    if (n > 100) break
  }
  return filename
}

export function useProject() {
  const store = useStore()
  const { showPrompt, showConfirm } = useDialogStore()

  async function newProject() {
    const title = await showPrompt('Project title:', 'My Book')
    if (!title) return

    const result = await window.api.newProject(title.trim())
    if (!result || 'error' in result) {
      if (result && 'error' in result) await showPrompt(`Error: ${result.error}`)
      return
    }
    store.setProject(result.projectDir, result.manifest)
    await window.api.addRecent(result.projectDir, result.manifest.title)
  }

  async function openProject() {
    const result = await window.api.openProject()
    if (!result || 'error' in result) {
      if (result && 'error' in result) await showPrompt(`Error: ${result.error}`)
      return
    }
    store.setProject(result.projectDir, result.manifest)
    await window.api.addRecent(result.projectDir, result.manifest.title)

    // Load first file if any
    if (result.manifest.files.length > 0) {
      const first = result.manifest.files[0]
      await selectFile(first.id, result.projectDir, first.filename)
    }
  }

  async function openProjectByPath(projectDir: string) {
    const result = await window.api.openProjectByPath(projectDir)
    if ('error' in result) {
      await showPrompt(`Could not open project:\n${result.error}`)
      return
    }
    store.setProject(result.projectDir, result.manifest)
    await window.api.addRecent(result.projectDir, result.manifest.title)

    if (result.manifest.files.length > 0) {
      const first = result.manifest.files[0]
      await selectFile(first.id, result.projectDir, first.filename)
    }
  }

  async function saveProject() {
    const { projectDir, manifest, activeFileId, fileContents } = useStore.getState()
    if (!projectDir || !manifest) return

    // Save active file content
    if (activeFileId) {
      const entry = manifest.files.find((f) => f.id === activeFileId)
      const content = fileContents[activeFileId] ?? ''
      if (entry) {
        await window.api.writeFile(projectDir, entry.filename, content)
      }
    }

    await window.api.saveManifest(projectDir, manifest)
    store.markSaved()
  }

  async function selectFile(id: string, projectDir?: string, filename?: string) {
    const state = useStore.getState()
    const dir = projectDir ?? state.projectDir
    if (!dir) return

    // Load content if not already cached
    if (!state.fileContents[id]) {
      const entry = filename
        ? { filename }
        : state.manifest?.files.find((f) => f.id === id)
      if (entry) {
        const result = await window.api.readFile(dir, entry.filename)
        store.loadFileContent(id, result.content)
      }
    }
    store.setActiveFile(id)
  }

  async function addFile() {
    const { projectDir, manifest } = useStore.getState()
    if (!projectDir || !manifest) return

    const title = await showPrompt('File title:', 'New Chapter')
    if (!title) return

    const base = slugify(title.trim())
    const filename = await uniqueFilename(projectDir, base)

    await window.api.createFile(projectDir, filename)

    const entry: FileEntry = {
      id: uuidv4(),
      filename,
      title: title.trim()
    }

    store.addFile(entry)
    store.loadFileContent(entry.id, '')
    store.setActiveFile(entry.id)

    // Persist manifest immediately
    const updated = useStore.getState().manifest!
    await window.api.saveManifest(projectDir, updated)
    store.markSaved()
  }

  async function deleteFile(id: string) {
    const { projectDir, manifest } = useStore.getState()
    if (!projectDir || !manifest) return

    const entry = manifest.files.find((f) => f.id === id)
    if (!entry) return

    const confirmed = await showConfirm(`Delete "${entry.title}"? This cannot be undone.`)
    if (!confirmed) return

    await window.api.deleteFile(projectDir, entry.filename)
    store.removeFile(id)

    // Select adjacent file
    const files = manifest.files
    const idx = files.findIndex((f) => f.id === id)
    const next = files[idx + 1] ?? files[idx - 1]
    if (next) {
      await selectFile(next.id)
    }

    // Persist manifest
    const updated = useStore.getState().manifest!
    await window.api.saveManifest(projectDir, updated)
    store.markSaved()
  }

  return { newProject, openProject, openProjectByPath, saveProject, addFile, deleteFile, selectFile }
}
