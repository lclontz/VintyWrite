import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../../store/useStore'
import { useDialogStore } from '../Dialog/dialogStore'
import styles from './ExportMenu.module.css'

export function ExportMenu(): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const manifest = useStore((s) => s.manifest)
  const fileContents = useStore((s) => s.fileContents)
  const { showAlert } = useDialogStore()

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  async function doExport(format: 'pdf' | 'docx') {
    if (!manifest) return
    setOpen(false)
    setBusy(true)

    // Eagerly load any files not yet in the store
    const projectDir = useStore.getState().projectDir
    const loadFileContent = useStore.getState().loadFileContent
    const missing = manifest.files.filter((f) => !(f.id in fileContents))
    for (const entry of missing) {
      if (projectDir) {
        const result = await window.api.readFile(projectDir, entry.filename)
        loadFileContent(entry.id, result.content)
        fileContents[entry.id] = result.content
      }
    }

    const result = await window.api.exportBook(format, manifest, fileContents)
    setBusy(false)

    if (result.canceled) return
    if (!result.success) {
      await showAlert(`Export failed:\n${result.error ?? 'Unknown error'}`)
    } else {
      await showAlert(`Exported successfully to:\n${result.filePath}`)
    }
  }

  return (
    <div className={styles.wrapper} ref={ref}>
      <button
        className={`dos-btn${busy ? ' active' : ''}`}
        disabled={!manifest || busy}
        onClick={() => setOpen((v) => !v)}
      >
        {busy ? 'EXPORTING...' : 'EXPORT'}
      </button>
      {open && (
        <div className={styles.dropdown}>
          <button className={styles.item} onClick={() => doExport('pdf')}>
            Export as PDF
          </button>
          <button className={styles.item} onClick={() => doExport('docx')}>
            Export as DOCX
          </button>
        </div>
      )}
    </div>
  )
}
