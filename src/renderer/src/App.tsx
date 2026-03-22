import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Toolbar } from './components/Toolbar/Toolbar'
import { FileNavigator } from './components/FileNavigator/FileNavigator'
import { Editor } from './components/Editor/Editor'
import { BookView } from './components/BookView/BookView'
import { useStore } from './store/useStore'
import { useProject } from './hooks/useProject'
import { useEditorSync } from './hooks/useEditorSync'
import { Dialog } from './components/Dialog/Dialog'
import styles from './App.module.css'

const MIN_NAV_WIDTH = 120
const MAX_NAV_WIDTH = 480

export default function App(): React.ReactElement {
  const viewMode = useStore((s) => s.viewMode)
  const phosphorColor = useStore((s) => s.phosphorColor)
  const { newProject, openProject, openProjectByPath, saveProject } = useProject()
  const [navWidth, setNavWidth] = useState(200)
  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(0)

  useEditorSync()

  useEffect(() => {
    const offNew = window.api.onMenuNewProject(newProject)
    const offOpen = window.api.onMenuOpen(openProject)
    const offSave = window.api.onMenuSave(saveProject)
    const offRecent = window.api.onMenuOpenRecent(openProjectByPath)
    return () => { offNew(); offOpen(); offSave(); offRecent() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── OneDrive / external sync watchers ───────────────────────────────────
  useEffect(() => {
    const offManifest = window.api.onWatchManifestChanged(async () => {
      const { projectDir, setProject } = useStore.getState()
      if (!projectDir) return
      const result = await window.api.openProjectByPath(projectDir)
      if (!('error' in result)) {
        // Preserve active file selection across manifest reload
        const prev = useStore.getState().activeFileId
        setProject(result.projectDir, result.manifest)
        // Re-select the same file if it still exists in the updated manifest
        const still = result.manifest.files.find((f) => f.id === prev)
        if (still) useStore.getState().setActiveFile(still.id)
      }
    })

    const offFile = window.api.onWatchFileChanged(async (filename: string) => {
      const { projectDir, manifest, activeFileId, isDirty, loadFileContent } = useStore.getState()
      if (!projectDir || !manifest) return

      const entry = manifest.files.find((f) => f.filename === filename)
      if (!entry) return

      // Don't overwrite the active file if the user has unsaved edits
      if (entry.id === activeFileId && isDirty) return

      const result = await window.api.readFile(projectDir, filename)
      if (!result.error) loadFileContent(entry.id, result.content)
    })

    return () => { offManifest(); offFile() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    startX.current = e.clientX
    startWidth.current = navWidth
    e.preventDefault()
  }, [navWidth])

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return
      const delta = e.clientX - startX.current
      setNavWidth(Math.min(MAX_NAV_WIDTH, Math.max(MIN_NAV_WIDTH, startWidth.current + delta)))
    }
    function onMouseUp() { dragging.current = false }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className={styles.app} data-theme={phosphorColor}>
      <Dialog />
      <div className={styles.toolbar}>
        <Toolbar />
      </div>
      <div className={styles.content}>
        <div className={styles.navigator} style={{ width: navWidth }}>
          <FileNavigator />
        </div>
        <div className={styles.divider} onMouseDown={onDividerMouseDown} />
        <div className={styles.main}>
          {viewMode === 'editor' ? <Editor /> : <BookView />}
        </div>
      </div>
    </div>
  )
}
