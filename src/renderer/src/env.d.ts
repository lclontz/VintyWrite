import type { ProjectManifest } from './types'

export interface RecentProject {
  projectDir: string
  title: string
  lastOpened: string
}

declare global {
  interface Window {
    api: {
      newProject: (title: string) => Promise<{ projectDir: string; manifest: ProjectManifest } | null | { error: string }>
      openProject: () => Promise<{ projectDir: string; manifest: ProjectManifest } | null | { error: string }>
      openProjectByPath: (projectDir: string) => Promise<{ projectDir: string; manifest: ProjectManifest } | { error: string }>
      saveManifest: (projectDir: string, manifest: ProjectManifest) => Promise<{ success: boolean; error?: string }>
      getRecents: () => Promise<RecentProject[]>
      addRecent: (projectDir: string, title: string) => Promise<RecentProject[]>
      readFile: (projectDir: string, filename: string) => Promise<{ content: string; error?: string }>
      writeFile: (projectDir: string, filename: string, content: string) => Promise<{ success: boolean; error?: string }>
      createFile: (projectDir: string, filename: string) => Promise<{ success: boolean; error?: string }>
      deleteFile: (projectDir: string, filename: string) => Promise<{ success: boolean; error?: string }>
      onMenuNewProject: (cb: () => void) => () => void
      onMenuOpen: (cb: () => void) => () => void
      onMenuSave: (cb: () => void) => () => void
      onMenuOpenRecent: (cb: (projectDir: string) => void) => () => void
      onMenuToggleFocus: (cb: () => void) => () => void
      onMenuFind: (cb: () => void) => () => void
      openExternal: (url: string) => Promise<void>
      onWatchManifestChanged: (cb: () => void) => () => void
      onWatchFileChanged: (cb: (filename: string) => void) => () => void
      exportBook: (
        format: 'pdf' | 'docx',
        manifest: ProjectManifest,
        fileContents: Record<string, string>
      ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>
    }
  }
}

export {}
