import React, { useEffect, useRef } from 'react'
import styles from './ContextMenu.module.css'

interface MenuItem {
  label: string
  action: () => void
}

interface ContextMenuProps {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Keep menu within viewport
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 220),
    top: Math.min(y, window.innerHeight - items.length * 32 - 16)
  }

  return (
    <div ref={ref} className={styles.menu} style={style}>
      {items.map((item, i) => (
        <button
          key={i}
          className={styles.item}
          onClick={() => { item.action(); onClose() }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
