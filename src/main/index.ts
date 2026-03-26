import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { registerIpcHandlers } from './ipc-handlers'
import { buildAndSetMenu } from './menu'
import { loadRecents } from './recents'
import { loadPrefs, savePrefs } from './prefs'
import { initAutoUpdater } from './updater'

async function createWindow(): Promise<void> {
  const [recents, prefs] = await Promise.all([loadRecents(), loadPrefs()])

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    },
    title: 'VintyWrite'
  })

  // Restore zoom level once the page has loaded
  win.webContents.on('did-finish-load', () => {
    win.webContents.setZoomLevel(prefs.zoomLevel)
  })

  // Save zoom level when the window is about to close
  win.on('close', async () => {
    await savePrefs({ zoomLevel: win.webContents.getZoomLevel() })
  })

  // Register IPC handlers BEFORE loading content
  registerIpcHandlers(win)

  buildAndSetMenu(win, recents)
  initAutoUpdater(win)

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
