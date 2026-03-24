import React, { useMemo, useState, useCallback, useEffect } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { search, openSearchPanel } from '@codemirror/search'
import { keymap } from '@codemirror/view'
import { Prec } from '@codemirror/state'
import { useStore } from '../../store/useStore'
import { FormatBar, wrapSelection } from './FormatBar'
import { ContextMenu } from './ContextMenu'
import { editorViewRef } from './editorViewRef'
import styles from './Editor.module.css'

const COLORS = {
  green: {
    main:       '#33ff33',
    dim:        '#1a8a1a',
    bright:     '#66ff66',
    mid:        '#55cc55',
    faint:      '#44bb44',
    veryFaint:  '#2a9a2a',
    activeLine: 'rgba(51, 255, 51, 0.04)',
    selection:  'rgba(51, 255, 51, 0.2)'
  },
  amber: {
    main:       '#ffb300',
    dim:        '#996b00',
    bright:     '#ffd54f',
    mid:        '#e6a000',
    faint:      '#cc8f00',
    veryFaint:  '#997000',
    activeLine: 'rgba(255, 179, 0, 0.04)',
    selection:  'rgba(255, 179, 0, 0.2)'
  },
  blue: {
    main:       '#00d4ff',
    dim:        '#007a99',
    bright:     '#66e5ff',
    mid:        '#00b8e0',
    faint:      '#009dc2',
    veryFaint:  '#006680',
    activeLine: 'rgba(0, 212, 255, 0.04)',
    selection:  'rgba(0, 212, 255, 0.2)'
  }
}

const formatKeymap = Prec.high(keymap.of([
  { key: 'Ctrl-b', run: (view) => { wrapSelection(view, '**', '**', 'bold'); return true } },
  { key: 'Ctrl-i', run: (view) => { wrapSelection(view, '*', '*', 'italic'); return true } },
]))

function makeTheme(color: 'green' | 'amber' | 'blue') {
  const c = COLORS[color]
  return EditorView.theme(
    {
      '&': {
        backgroundColor: '#000000',
        color: c.main,
        fontFamily: "'Consolas', 'Courier New', monospace",
        fontSize: '13px',
        height: '100%'
      },
      '.cm-content': { caretColor: c.main, padding: '12px 16px' },
      '.cm-line': { marginBottom: '0.4em' },
      '.cm-cursor, .cm-dropCursor': { borderLeftColor: c.main },
      '.cm-activeLine': { backgroundColor: c.activeLine },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: `${c.selection} !important`
      },
      '.cm-gutters': {
        backgroundColor: '#000',
        borderRight: `1px solid ${c.dim}`,
        color: c.dim
      },
      '.cm-lineNumbers .cm-gutterElement': {
        color: c.dim,
        paddingLeft: '8px',
        paddingRight: '8px'
      },
      '.cm-scroller': { overflow: 'auto', fontFamily: "'Consolas', 'Courier New', monospace" },
      '.cm-focused': { outline: 'none' },
      '.tok-heading':   { color: c.bright, fontWeight: 'bold' },
      '.tok-strong':    { color: c.bright, fontWeight: 'bold' },
      '.tok-emphasis':  { color: c.mid, fontStyle: 'italic' },
      '.tok-link':      { color: c.faint },
      '.tok-monospace': { color: c.veryFaint },
      '.tok-comment':   { color: c.dim }
    },
    { dark: true }
  )
}

export function Editor(): React.ReactElement {
  const activeFileId = useStore((s) => s.activeFileId)
  const fileContents = useStore((s) => s.fileContents)
  const setFileContent = useStore((s) => s.setFileContent)
  const manifest = useStore((s) => s.manifest)
  const phosphorColor = useStore((s) => s.phosphorColor)

  const theme = useMemo(() => makeTheme(phosphorColor), [phosphorColor])

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; word: string } | null>(null)

  // Open search panel from menu
  useEffect(() => {
    const off = window.api.onMenuFind(() => {
      const view = editorViewRef.current
      if (view) openSearchPanel(view)
    })
    return off
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const view = editorViewRef.current
    if (!view) return

    // Get selected text, or the word under the cursor
    const sel = view.state.sliceDoc(
      view.state.selection.main.from,
      view.state.selection.main.to
    ).trim()

    let word = sel
    if (!word) {
      const pos = view.posAtCoords({ x: e.clientX, y: e.clientY })
      if (pos != null) {
        const wordRange = view.state.wordAt(pos)
        if (wordRange) {
          word = view.state.sliceDoc(wordRange.from, wordRange.to)
        }
      }
    }

    if (word) {
      setCtxMenu({ x: e.clientX, y: e.clientY, word })
    }
  }, [])

  function lookupItems(word: string) {
    const enc = encodeURIComponent(word)
    return [
      {
        label: `Define: "${word}"`,
        action: () => window.api.openExternal(`https://www.merriam-webster.com/dictionary/${enc}`)
      },
      {
        label: `Synonyms: "${word}"`,
        action: () => window.api.openExternal(`https://www.thesaurus.com/browse/${enc}`)
      },
      {
        label: `Wikipedia: "${word}"`,
        action: () => window.api.openExternal(`https://en.wikipedia.org/wiki/Special:Search?search=${enc}`)
      }
    ]
  }

  const entry = manifest?.files.find((f) => f.id === activeFileId)
  const content = activeFileId ? (fileContents[activeFileId] ?? '') : ''

  if (!activeFileId) {
    return (
      <div className={styles.placeholder}>
        <div className={styles.placeholderText}>
          <div className="glow">▓▓▓ VINTYWRITE ▓▓▓</div>
          <div>═══════════════════</div>
          <div>Select a file to edit</div>
          <div>or use [NEW] to create</div>
          <div>a project.</div>
          <div>═══════════════════</div>
          <div className={styles.cursor}>█</div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.editor}>
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          items={lookupItems(ctxMenu.word)}
          onClose={() => setCtxMenu(null)}
        />
      )}
      <div className={styles.fileHeader}>
        ║ {entry?.title ?? entry?.filename ?? activeFileId}
      </div>
      <FormatBar />
      <div className={styles.cmWrapper} onContextMenu={handleContextMenu}>
        <CodeMirror
          key={activeFileId}
          value={content}
          height="100%"
          theme="none"
          extensions={[markdown(), theme, EditorView.lineWrapping, search({ top: false }), formatKeymap]}
          onCreateEditor={(view) => { editorViewRef.current = view }}
          onChange={(value) => {
            if (activeFileId) setFileContent(activeFileId, value)
          }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            history: true,
            foldGutter: false,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: false,
            autocompletion: false,
            rectangularSelection: false,
            crosshairCursor: false,
            highlightActiveLineGutter: true,
            searchKeymap: true
          }}
        />
      </div>
    </div>
  )
}
