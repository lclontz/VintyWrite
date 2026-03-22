import { create } from 'zustand'

interface PromptDialog {
  type: 'prompt'
  message: string
  defaultValue?: string
}

interface ConfirmDialog {
  type: 'confirm'
  message: string
}

interface AlertDialog {
  type: 'alert'
  message: string
}

type DialogConfig = PromptDialog | ConfirmDialog | AlertDialog

interface DialogState {
  dialog: DialogConfig | null
  resolve: (value: string | boolean | null) => void

  showPrompt: (message: string, defaultValue?: string) => Promise<string | null>
  showConfirm: (message: string) => Promise<boolean>
  showAlert: (message: string) => Promise<void>
}

export const useDialogStore = create<DialogState>((set) => ({
  dialog: null,
  resolve: () => {},

  showPrompt: (message, defaultValue) =>
    new Promise<string | null>((res) => {
      set({
        dialog: { type: 'prompt', message, defaultValue },
        resolve: (value) => {
          set({ dialog: null })
          res(value as string | null)
        }
      })
    }),

  showConfirm: (message) =>
    new Promise<boolean>((res) => {
      set({
        dialog: { type: 'confirm', message },
        resolve: (value) => {
          set({ dialog: null })
          res(value as boolean)
        }
      })
    }),

  showAlert: (message) =>
    new Promise<void>((res) => {
      set({
        dialog: { type: 'alert', message },
        resolve: () => {
          set({ dialog: null })
          res()
        }
      })
    })
}))
