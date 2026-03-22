import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function useEditorSync(): void {
  const activeFileId = useStore((s) => s.activeFileId)
  const fileContents = useStore((s) => s.fileContents)
  const projectDir = useStore((s) => s.projectDir)
  const isDirty = useStore((s) => s.isDirty)
  const manifest = useStore((s) => s.manifest)
  const markSaved = useStore((s) => s.markSaved)

  useEffect(() => {
    if (!activeFileId || !projectDir || !isDirty || !manifest) return

    const entry = manifest.files.find((f) => f.id === activeFileId)
    if (!entry) return

    const content = fileContents[activeFileId] ?? ''

    const timer = setTimeout(async () => {
      await window.api.writeFile(projectDir, entry.filename, content)
      // Only mark saved if the file is still the active one
      if (useStore.getState().activeFileId === activeFileId) {
        markSaved()
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [activeFileId, fileContents, projectDir, isDirty, manifest, markSaved])
}
