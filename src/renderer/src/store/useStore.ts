import { create } from 'zustand'
import type { FileEntry, ProjectManifest } from '../types'

interface AppState {
  projectDir: string | null
  manifest: ProjectManifest | null
  activeFileId: string | null
  fileContents: Record<string, string>
  isDirty: boolean
  viewMode: 'editor' | 'book'
  phosphorColor: 'green' | 'amber' | 'blue'
  isFocusMode: boolean
  sessionStartTime: number
  sessionWordsAtStart: number | null

  setProject: (projectDir: string, manifest: ProjectManifest) => void
  setActiveFile: (id: string) => void
  setFileContent: (id: string, content: string) => void
  loadFileContent: (id: string, content: string) => void
  reorderFiles: (newOrder: FileEntry[]) => void
  addFile: (entry: FileEntry) => void
  removeFile: (id: string) => void
  setViewMode: (mode: 'editor' | 'book') => void
  setPhosphorColor: (color: 'green' | 'amber' | 'blue') => void
  markSaved: () => void
  closeProject: () => void
  toggleFocusMode: () => void
  setSessionWordsAtStart: (n: number) => void
}

export const useStore = create<AppState>((set) => ({
  projectDir: null,
  manifest: null,
  activeFileId: null,
  fileContents: {},
  isDirty: false,
  viewMode: 'editor',
  phosphorColor: (localStorage.getItem('phosphorColor') as 'green' | 'amber' | 'blue') ?? 'green',
  isFocusMode: false,
  sessionStartTime: Date.now(),
  sessionWordsAtStart: null,

  setProject: (projectDir, manifest) => {
    localStorage.setItem('lastProjectDir', projectDir)
    localStorage.removeItem('lastActiveFileId')
    set({ projectDir, manifest, activeFileId: null, fileContents: {}, isDirty: false, sessionWordsAtStart: null })
  },

  setActiveFile: (id) => {
    localStorage.setItem('lastActiveFileId', id)
    set({ activeFileId: id })
  },

  setFileContent: (id, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [id]: content },
      isDirty: true
    })),

  loadFileContent: (id, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [id]: content }
    })),

  reorderFiles: (newOrder) =>
    set((state) => ({
      manifest: state.manifest ? { ...state.manifest, files: newOrder } : null,
      isDirty: true
    })),

  addFile: (entry) =>
    set((state) => ({
      manifest: state.manifest
        ? { ...state.manifest, files: [...state.manifest.files, entry] }
        : null,
      isDirty: true
    })),

  removeFile: (id) =>
    set((state) => ({
      manifest: state.manifest
        ? { ...state.manifest, files: state.manifest.files.filter((f) => f.id !== id) }
        : null,
      activeFileId: state.activeFileId === id ? null : state.activeFileId,
      isDirty: true
    })),

  setViewMode: (mode) => set({ viewMode: mode }),

  setPhosphorColor: (color) => { localStorage.setItem('phosphorColor', color); set({ phosphorColor: color }) },

  markSaved: () => set({ isDirty: false }),

  closeProject: () => {
    localStorage.removeItem('lastProjectDir')
    localStorage.removeItem('lastActiveFileId')
    set({ projectDir: null, manifest: null, activeFileId: null, fileContents: {}, isDirty: false })
  },

  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),

  setSessionWordsAtStart: (n) => set({ sessionWordsAtStart: n })
}))
