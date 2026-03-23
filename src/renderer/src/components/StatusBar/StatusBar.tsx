import React, { useEffect, useRef, useState } from 'react'
import { useStore } from '../../store/useStore'
import styles from './StatusBar.module.css'

function countWords(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return trimmed.split(/\s+/).length
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function StatusBar(): React.ReactElement {
  const manifest = useStore((s) => s.manifest)
  const activeFileId = useStore((s) => s.activeFileId)
  const fileContents = useStore((s) => s.fileContents)
  const projectDir = useStore((s) => s.projectDir)
  const sessionStartTime = useStore((s) => s.sessionStartTime)
  const sessionWordsAtStart = useStore((s) => s.sessionWordsAtStart)
  const setSessionWordsAtStart = useStore((s) => s.setSessionWordsAtStart)

  const [elapsed, setElapsed] = useState(Date.now() - sessionStartTime)
  const baselineCaptured = useRef(false)
  const prevProjectDir = useRef<string | null>(null)

  // Tick the timer every second
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - sessionStartTime), 1000)
    return () => clearInterval(id)
  }, [sessionStartTime])

  // Derived word counts
  const chapterWords = activeFileId ? countWords(fileContents[activeFileId] ?? '') : 0
  const bookWords = manifest?.files.reduce(
    (sum, f) => sum + countWords(fileContents[f.id] ?? ''),
    0
  ) ?? 0

  // Capture session baseline once files start loading for a new project
  useEffect(() => {
    if (projectDir !== prevProjectDir.current) {
      baselineCaptured.current = false
      prevProjectDir.current = projectDir
    }
    if (!baselineCaptured.current && manifest && Object.keys(fileContents).length > 0) {
      setSessionWordsAtStart(bookWords)
      baselineCaptured.current = true
    }
  }, [projectDir, manifest, fileContents, bookWords, setSessionWordsAtStart])

  const sessionWords = sessionWordsAtStart !== null
    ? Math.max(0, bookWords - sessionWordsAtStart)
    : 0

  if (!manifest) return <div className={styles.statusBar} />

  return (
    <div className={styles.statusBar}>
      <span className={styles.stat}>
        <span className={styles.label}>CHAPTER:</span>
        <span className={styles.value}>{chapterWords.toLocaleString()} wds</span>
      </span>
      <span className={styles.sep}>│</span>
      <span className={styles.stat}>
        <span className={styles.label}>BOOK:</span>
        <span className={styles.value}>{bookWords.toLocaleString()} wds</span>
      </span>
      <span className={styles.sep}>│</span>
      <span className={styles.stat}>
        <span className={styles.label}>SESSION:</span>
        <span className={styles.value}>+{sessionWords.toLocaleString()} wds</span>
      </span>
      <span className={styles.sep}>│</span>
      <span className={styles.stat}>
        <span className={styles.value}>{formatTime(elapsed)}</span>
      </span>
    </div>
  )
}
