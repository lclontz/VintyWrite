import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // Project operations
  newProject: (title: string) => ipcRenderer.invoke('project:new', { title }),
  openProject: () => ipcRenderer.invoke('project:open'),
  openProjectByPath: (projectDir: string) => ipcRenderer.invoke('project:open-path', { projectDir }),
  saveManifest: (projectDir: string, manifest: unknown) =>
    ipcRenderer.invoke('project:save-manifest', { projectDir, manifest }),

  // Recents
  getRecents: () => ipcRenderer.invoke('recents:get'),
  addRecent: (projectDir: string, title: string) =>
    ipcRenderer.invoke('recents:add', { projectDir, title }),

  // File operations
  readFile: (projectDir: string, filename: string) =>
    ipcRenderer.invoke('file:read', { projectDir, filename }),
  writeFile: (projectDir: string, filename: string, content: string) =>
    ipcRenderer.invoke('file:write', { projectDir, filename, content }),
  createFile: (projectDir: string, filename: string) =>
    ipcRenderer.invoke('file:create', { projectDir, filename }),
  deleteFile: (projectDir: string, filename: string) =>
    ipcRenderer.invoke('file:delete', { projectDir, filename }),

  // Menu event listeners
  onMenuNewProject: (cb: () => void) => {
    ipcRenderer.on('menu:new-project', cb)
    return () => ipcRenderer.removeListener('menu:new-project', cb)
  },
  onMenuOpen: (cb: () => void) => {
    ipcRenderer.on('menu:open-project', cb)
    return () => ipcRenderer.removeListener('menu:open-project', cb)
  },
  onMenuSave: (cb: () => void) => {
    ipcRenderer.on('menu:save', cb)
    return () => ipcRenderer.removeListener('menu:save', cb)
  },
  onMenuOpenRecent: (cb: (projectDir: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, projectDir: string) => cb(projectDir)
    ipcRenderer.on('menu:open-recent', handler)
    return () => ipcRenderer.removeListener('menu:open-recent', handler)
  },

  openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', { url }),

  exportBook: (format: 'pdf' | 'docx', manifest: unknown, fileContents: Record<string, string>) =>
    ipcRenderer.invoke('export:book', { format, manifest, fileContents }),

  onWatchManifestChanged: (cb: () => void) => {
    ipcRenderer.on('watch:manifest-changed', cb)
    return () => ipcRenderer.removeListener('watch:manifest-changed', cb)
  },
  onWatchFileChanged: (cb: (filename: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, filename: string) => cb(filename)
    ipcRenderer.on('watch:file-changed', handler)
    return () => ipcRenderer.removeListener('watch:file-changed', handler)
  }
})
