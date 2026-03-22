import type { EditorView } from '@codemirror/view'

// Module-level ref so FormatBar can access the CodeMirror view instance
export const editorViewRef: { current: EditorView | null } = { current: null }
