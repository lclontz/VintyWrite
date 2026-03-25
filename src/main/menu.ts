import { Menu, BrowserWindow, shell, dialog, app } from 'electron'
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
          label: 'Recent Projects',
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
          label: 'About VintyWrite',
          click: async () => {
            const { response } = await dialog.showMessageBox(win, {
              type: 'info',
              title: 'About VintyWrite',
              message: 'VintyWrite',
              detail: `Version ${app.getVersion()}\n\nCopyright 2026, Lee Clontz\n\ngithub.com/lclontz/VintyWrite\nclontz.blog`,
              buttons: ['OK', 'GitHub Repository', 'clontz.blog'],
              defaultId: 0
            })
            if (response === 1) shell.openExternal('https://github.com/lclontz/VintyWrite')
            if (response === 2) shell.openExternal('https://clontz.blog')
          }
        },
        { type: 'separator' },
        {
          label: 'Bug Reports / Feature Requests',
          click: () => shell.openExternal('https://github.com/lclontz/VintyWrite/issues')
        }
      ]
    }
  ])

  Menu.setApplicationMenu(menu)
}
