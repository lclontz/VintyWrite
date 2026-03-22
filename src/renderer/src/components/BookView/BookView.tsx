import React, { useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useStore } from '../../store/useStore'
import styles from './BookView.module.css'

export function BookView(): React.ReactElement {
  const manifest = useStore((s) => s.manifest)
  const projectDir = useStore((s) => s.projectDir)
  const fileContents = useStore((s) => s.fileContents)
  const loadFileContent = useStore((s) => s.loadFileContent)

  const files = manifest?.files ?? []

  // Eagerly load all files that aren't cached yet
  useEffect(() => {
    if (!projectDir || !manifest) return

    const missing = manifest.files.filter((f) => !(f.id in fileContents))
    missing.forEach(async (entry) => {
      const result = await window.api.readFile(projectDir, entry.filename)
      loadFileContent(entry.id, result.content)
    })
  }, [projectDir, manifest, fileContents, loadFileContent])

  if (!manifest) {
    return (
      <div className={styles.empty}>
        <div>No project open.</div>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className={styles.empty}>
        <div>No files in this project.</div>
        <div>Add files using [+] in the file navigator.</div>
      </div>
    )
  }

  return (
    <div className={styles.bookView}>
      <div className={styles.bookTitle}>
        <span className="glow">╔══ {manifest.title.toUpperCase()} ══╗</span>
      </div>

      {files.map((entry, index) => {
        const content = fileContents[entry.id]
        const isLoading = content === undefined

        return (
          <div key={entry.id} className={styles.section}>
            {/* File divider */}
            <div className={styles.divider}>
              ╠══ {entry.title} ══╣
            </div>

            {/* Content */}
            <div className={styles.content}>
              {isLoading ? (
                <span className={styles.loading}>Loading...</span>
              ) : content.trim() === '' ? (
                <span className={styles.empty2}>( empty )</span>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              )}
            </div>

            {index === files.length - 1 && (
              <div className={styles.divider}>╚{'═'.repeat(24)}╝</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
