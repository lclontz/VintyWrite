import React from 'react'
import { EditorSelection } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { editorViewRef } from './editorViewRef'
import styles from './FormatBar.module.css'

export function wrapSelection(view: EditorView, before: string, after: string, placeholder = 'text') {
  const { state } = view
  const changes = state.changeByRange((range) => {
    if (range.empty) {
      return {
        changes: [{ from: range.from, insert: before + placeholder + after }],
        range: EditorSelection.range(
          range.from + before.length,
          range.from + before.length + placeholder.length
        )
      }
    }
    return {
      changes: [
        { from: range.from, insert: before },
        { from: range.to, insert: after }
      ],
      range: EditorSelection.range(range.from, range.to + before.length + after.length)
    }
  })
  view.dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input' }))
  view.focus()
}

function prefixLine(view: EditorView, prefix: string) {
  const { state } = view
  const changes = state.changeByRange((range) => {
    const line = state.doc.lineAt(range.from)
    // Toggle: remove prefix if already present, else add it
    if (line.text.startsWith(prefix)) {
      return {
        changes: [{ from: line.from, to: line.from + prefix.length, insert: '' }],
        range: EditorSelection.range(
          Math.max(line.from, range.from - prefix.length),
          Math.max(line.from, range.to - prefix.length)
        )
      }
    }
    return {
      changes: [{ from: line.from, insert: prefix }],
      range: EditorSelection.range(range.from + prefix.length, range.to + prefix.length)
    }
  })
  view.dispatch(state.update(changes, { scrollIntoView: true, userEvent: 'input' }))
  view.focus()
}

function insertHr(view: EditorView) {
  const { state } = view
  const pos = state.selection.main.to
  const line = state.doc.lineAt(pos)
  const insert = line.text.trim() === '' ? '---\n' : '\n\n---\n\n'
  view.dispatch(
    state.update({
      changes: { from: pos, insert },
      scrollIntoView: true,
      userEvent: 'input'
    })
  )
  view.focus()
}

interface FmtButton {
  label: string
  title: string
  action: (view: EditorView) => void
}

const buttons: FmtButton[] = [
  { label: 'H1',  title: 'Heading 1',     action: (v) => prefixLine(v, '# ') },
  { label: 'H2',  title: 'Heading 2',     action: (v) => prefixLine(v, '## ') },
  { label: 'H3',  title: 'Heading 3',     action: (v) => prefixLine(v, '### ') },
  { label: 'B',   title: 'Bold',          action: (v) => wrapSelection(v, '**', '**', 'bold') },
  { label: 'I',   title: 'Italic',        action: (v) => wrapSelection(v, '*', '*', 'italic') },
  { label: '~~',  title: 'Strikethrough', action: (v) => wrapSelection(v, '~~', '~~', 'text') },
  { label: '`',   title: 'Inline code',   action: (v) => wrapSelection(v, '`', '`', 'code') },
  { label: '```', title: 'Code block',    action: (v) => wrapSelection(v, '```\n', '\n```', 'code') },
  { label: '>',   title: 'Blockquote',    action: (v) => prefixLine(v, '> ') },
  { label: '- ',  title: 'Bullet list',   action: (v) => prefixLine(v, '- ') },
  { label: '1.',  title: 'Numbered list', action: (v) => prefixLine(v, '1. ') },
  { label: '---', title: 'Horizontal rule', action: insertHr },
  { label: '[ ]', title: 'Link',          action: (v) => wrapSelection(v, '[', '](url)', 'link text') },
]

export function FormatBar(): React.ReactElement {
  function handleClick(action: (view: EditorView) => void) {
    const view = editorViewRef.current
    if (view) action(view)
  }

  return (
    <div className={styles.formatBar}>
      {buttons.map((btn, i) => (
        <button
          key={i}
          className={styles.fmtBtn}
          title={btn.title}
          onMouseDown={(e) => {
            e.preventDefault() // prevent editor losing focus
            handleClick(btn.action)
          }}
        >
          {btn.label}
        </button>
      ))}
    </div>
  )
}
