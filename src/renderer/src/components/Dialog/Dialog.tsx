import React, { useEffect, useRef } from 'react'
import { useDialogStore } from './dialogStore'
import styles from './Dialog.module.css'

export function Dialog(): React.ReactElement | null {
  const { dialog, resolve } = useDialogStore()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dialog && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [dialog])

  if (!dialog) return null

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') confirm()
    if (e.key === 'Escape') cancel()
  }

  function confirm() {
    if (!dialog) return
    if (dialog.type === 'prompt') {
      resolve(inputRef.current?.value ?? dialog.defaultValue ?? '')
    } else {
      resolve(true)
    }
  }

  function cancel() {
    resolve(dialog?.type === 'prompt' ? null : false)
  }

  return (
    <div className={styles.overlay} onKeyDown={handleKeyDown}>
      <div className={styles.box}>
        <div className={styles.title}>╔═ VINTYWRITE ═╗</div>
        <div className={styles.message}>{dialog.message}</div>

        {dialog.type === 'prompt' && (
          <input
            ref={inputRef}
            className={styles.input}
            defaultValue={dialog.defaultValue ?? ''}
            spellCheck={false}
          />
        )}

        <div className={styles.buttons}>
          <button className="dos-btn" onClick={confirm}>OK</button>
          {dialog.type !== 'alert' && (
            <button className="dos-btn" onClick={cancel}>CANCEL</button>
          )}
        </div>
      </div>
    </div>
  )
}
