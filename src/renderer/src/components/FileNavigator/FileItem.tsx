import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { FileEntry } from '../../types'
import styles from './FileNavigator.module.css'

interface FileItemProps {
  entry: FileEntry
  displayTitle: string
  isActive: boolean
  onClick: () => void
}

export function FileItem({ entry, displayTitle, isActive, onClick }: FileItemProps): React.ReactElement {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: entry.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.fileItem} ${isActive ? styles.active : ''}`}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <span className={styles.indicator}>{isActive ? '►' : ' '}</span>
      <span className={styles.title}>{displayTitle}</span>
    </div>
  )
}
