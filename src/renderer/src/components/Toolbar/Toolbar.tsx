import React from 'react'
import { useStore } from '../../store/useStore'
import { useProject } from '../../hooks/useProject'
import { ExportMenu } from './ExportMenu'
import styles from './Toolbar.module.css'

export function Toolbar(): React.ReactElement {
  const manifest = useStore((s) => s.manifest)
  const isDirty = useStore((s) => s.isDirty)
  const viewMode = useStore((s) => s.viewMode)
  const setViewMode = useStore((s) => s.setViewMode)
  const phosphorColor = useStore((s) => s.phosphorColor)
  const setPhosphorColor = useStore((s) => s.setPhosphorColor)
  const isFocusMode = useStore((s) => s.isFocusMode)
  const toggleFocusMode = useStore((s) => s.toggleFocusMode)
  const { newProject, openProject, saveProject } = useProject()

  const title = manifest?.title ?? 'VINTYWRITE v1.0'

  return (
    <div className={styles.toolbar}>
      <span className={`${styles.appTitle} glow`}>
        ▓ {title.toUpperCase()}
        {isDirty ? ' *' : ''}
      </span>

      <div className={styles.actions}>
        <button className="dos-btn" onClick={newProject}>NEW</button>
        <button className="dos-btn" onClick={openProject}>OPEN</button>
        <button className="dos-btn" onClick={saveProject} disabled={!manifest}>
          SAVE
        </button>
      </div>

      <div className={styles.viewToggle}>
        <button
          className={`dos-btn${viewMode === 'editor' ? ' active' : ''}`}
          onClick={() => setViewMode('editor')}
        >
          EDITOR
        </button>
        <button
          className={`dos-btn${viewMode === 'book' ? ' active' : ''}`}
          onClick={() => setViewMode('book')}
          disabled={!manifest}
        >
          BOOK VIEW
        </button>
      </div>

      <div className={styles.exportWrap}>
        <ExportMenu />
      </div>

      <div className={styles.focusToggle}>
        <button
          className={`dos-btn${isFocusMode ? ' active' : ''}`}
          onClick={toggleFocusMode}
          title="Toggle focus mode (F11)"
        >
          {isFocusMode ? 'EXIT FOCUS' : 'FOCUS'}
        </button>
      </div>

      <div className={styles.colorToggle}>
        <button
          className={styles.phosphorDot}
          data-active={phosphorColor === 'green'}
          title="Green phosphor"
          onClick={() => setPhosphorColor('green')}
          style={{ background: '#33ff33' }}
        />
        <button
          className={styles.phosphorDot}
          data-active={phosphorColor === 'amber'}
          title="Amber phosphor"
          onClick={() => setPhosphorColor('amber')}
          style={{ background: '#ffb300' }}
        />
        <button
          className={styles.phosphorDot}
          data-active={phosphorColor === 'blue'}
          title="Blue phosphor"
          onClick={() => setPhosphorColor('blue')}
          style={{ background: '#00d4ff' }}
        />
      </div>
    </div>
  )
}
