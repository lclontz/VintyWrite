import React from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { useStore } from '../../store/useStore'
import { useProject } from '../../hooks/useProject'
import { FileItem } from './FileItem'
import styles from './FileNavigator.module.css'

function extractH1(content: string | undefined): string | null {
  if (!content) return null
  const match = content.match(/^#[ \t]+(.+)/m)
  return match ? match[1].trim() : null
}

export function FileNavigator(): React.ReactElement {
  const manifest = useStore((s) => s.manifest)
  const activeFileId = useStore((s) => s.activeFileId)
  const projectDir = useStore((s) => s.projectDir)
  const fileContents = useStore((s) => s.fileContents)
  const reorderFiles = useStore((s) => s.reorderFiles)
  const { selectFile, addFile, deleteFile } = useProject()

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  const files = manifest?.files ?? []

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id || !manifest || !projectDir) return

    const oldIndex = files.findIndex((f) => f.id === active.id)
    const newIndex = files.findIndex((f) => f.id === over.id)
    const reordered = arrayMove(files, oldIndex, newIndex)
    reorderFiles(reordered)

    // Persist manifest
    const updated = { ...manifest, files: reordered }
    await window.api.saveManifest(projectDir, updated)
  }

  return (
    <div className={styles.navigator}>
      {/* Header */}
      <div className={styles.header}>
        <span>╔═ PROJECT ═╗</span>
      </div>

      {/* File list */}
      <div className={styles.fileList}>
        {!manifest ? (
          <div className={styles.empty}>
            <div>No project open.</div>
            <div>Use [NEW] or [OPEN]</div>
          </div>
        ) : files.length === 0 ? (
          <div className={styles.empty}>
            <div>No files yet.</div>
            <div>Press [+] to add one.</div>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={files.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              {files.map((entry) => (
                <FileItem
                  key={entry.id}
                  entry={entry}
                  displayTitle={extractH1(fileContents[entry.id]) ?? entry.title}
                  isActive={entry.id === activeFileId}
                  onClick={() => selectFile(entry.id)}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Footer actions */}
      <div className={styles.footer}>
        <button
          className="dos-btn"
          onClick={addFile}
          disabled={!manifest}
          title="Add file"
        >
          +
        </button>
        <button
          className="dos-btn"
          onClick={() => activeFileId && deleteFile(activeFileId)}
          disabled={!activeFileId}
          title="Delete selected file"
        >
          -
        </button>
      </div>
    </div>
  )
}
