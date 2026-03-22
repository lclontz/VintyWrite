export interface FileEntry {
  id: string
  filename: string  // basename only, e.g. "chapter-one.md"
  title: string     // display name in navigator
}

export interface ProjectManifest {
  title: string
  files: FileEntry[]
}
