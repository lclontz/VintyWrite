import { Menu, BrowserWindow, shell } from 'electron'
import type { RecentProject } from './recents'

export function buildAndSetMenu(win: BrowserWindow, recents: RecentProject[]): void {
  const recentSubmenu =
    recents.length === 0
      ? [{ label: '(no recent projects)', enabled: false }]
      : recents.map((r) => ({
          label: r.title,
          sublabel: r.projectDir,
          click: () => win.webContents.send('menu:open-recent', r.projectDir)
        }))

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New Project',
          accelerator: 'CmdOrCtrl+N',
          click: () => win.webContents.send('menu:new-project')
        },
        {
          label: 'New Chapter',
          accelerator: 'CmdOrCtrl+M',
          click: () => win.webContents.send('menu:new-chapter')
        },
        {
          label: 'Open Project',
          accelerator: 'CmdOrCtrl+O',
          click: () => win.webContents.send('menu:open-project')
        },
        {
          label: 'Recent Books',
          submenu: recentSubmenu
        },
        { type: 'separator' },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => win.webContents.send('menu:save')
        },
        { type: 'separator' },
        { label: 'Quit', role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find / Replace',
          accelerator: 'CmdOrCtrl+F',
          click: () => win.webContents.send('menu:find')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        {
          label: 'Focus Mode',
          accelerator: 'F11',
          click: () => win.webContents.send('menu:toggle-focus')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Bug Reports / Feature Requests',
          click: () => shell.openExternal('https://github.com/lclontz/VintyWrite/issues')
        }
      ]
    }
  ])

  Menu.setApplicationMenu(menu)
}
