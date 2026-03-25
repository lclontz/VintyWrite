import { app, dialog, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'

export function initAutoUpdater(win: BrowserWindow): void {
  if (!app.isPackaged) return

  autoUpdater.checkForUpdates()

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new version of VintyWrite has been downloaded. Restart to install it.',
      buttons: ['Restart Now', 'Later']
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
  })

  autoUpdater.on('error', () => { /* ignore network/update errors silently */ })
}
