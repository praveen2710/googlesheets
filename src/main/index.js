'use strict'

import { app, BrowserWindow, Menu } from 'electron'

/**
 * Set `__static` path to static files in production
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-static-assets.html
 */
if (process.env.NODE_ENV !== 'development') {
  global.__static = require('path').join(__dirname, '/static').replace(/\\/g, '\\\\')
}

let mainWindow
let settingWindow
let companyWindow
let partyNoWindow

const winURL = process.env.NODE_ENV === 'development'
  ? `http://localhost:9080`
  : `file://${__dirname}/index.html`

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    height: 563,
    useContentSize: true,
    width: 1000
  })

  settingWindow = new BrowserWindow({
    height: 400,
    show: false,
    width: 400,
    parent: mainWindow,
    alwaysOnTop: true,
    model: true
  })

  companyWindow = new BrowserWindow({
    height: 400,
    show: false,
    width: 400,
    parent: mainWindow,
    alwaysOnTop: true,
    model: true
  })

  partyNoWindow = new BrowserWindow({
    height: 400,
    show: false,
    width: 400,
    parent: mainWindow,
    alwaysOnTop: true,
    model: true
  })

  mainWindow.loadURL(winURL)
  settingWindow.loadURL(winURL + '#/settings')
  companyWindow.loadURL(winURL + '#/company')
  partyNoWindow.loadURL(winURL + '#/partyNo')

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  settingWindow.on('close', (e) => {
    e.preventDefault()
    settingWindow.hide()
  })

  companyWindow.on('close', (e) => {
    e.preventDefault()
    companyWindow.hide()
    mainWindow.reload()
  })

  partyNoWindow.on('close', (e) => {
    e.preventDefault()
    partyNoWindow.hide()
    mainWindow.reload()
  })

  // require('./mainmenu')

  const template = [
    {
      label: 'Edit',
      submenu: [
        {
          role: 'undo'
        },
        {
          role: 'redo'
        },
        {
          type: 'separator'
        },
        {
          role: 'cut'
        },
        {
          role: 'copy'
        },
        {
          role: 'paste'
        },
        {
          role: 'pasteandmatchstyle'
        },
        {
          role: 'delete'
        },
        {
          role: 'selectall'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.reload()
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
          click (item, focusedWindow) {
            if (focusedWindow) focusedWindow.webContents.toggleDevTools()
          }
        },
        {
          type: 'separator'
        },
        {
          role: 'resetzoom'
        },
        {
          role: 'zoomin'
        },
        {
          role: 'zoomout'
        },
        {
          type: 'separator'
        },
        {
          role: 'togglefullscreen'
        }
      ]
    },
    {
      role: 'window',
      submenu: [
        {
          role: 'minimize'
        },
        {
          role: 'close'
        }
      ]
    },
    {
      label: 'Custom',
      submenu: [
        {
          label: 'Setting',
          click () {
            openSettingsWindow()
          }
        },
        {
          label: 'Add Company',
          click () {
            openCompanyWindow()
          }
        },
        {
          label: 'Add PartyNo',
          click () {
            openPartyNoWindow()
          }
        }
      ]
    }
  ]
  if (process.platform === 'darwin') {
    const name = app.getName()
    template.unshift({
      label: name,
      submenu: [
        {
          role: 'about'
        },
        {
          type: 'separator'
        },
        {
          role: 'services',
          submenu: []
        },
        {
          type: 'separator'
        },
        {
          role: 'hide'
        },
        {
          role: 'hideothers'
        },
        {
          role: 'unhide'
        },
        {
          type: 'separator'
        },
        {
          role: 'quit'
        }
      ]
    })
    // Window menu.
    template[3].submenu = [
      {
        label: 'Close',
        accelerator: 'CmdOrCtrl+W',
        role: 'close'
      },
      {
        label: 'Minimize',
        accelerator: 'CmdOrCtrl+M',
        role: 'minimize'
      },
      {
        label: 'Zoom',
        role: 'zoom'
      },
      {
        type: 'separator'
      },
      {
        label: 'Bring All to Front',
        role: 'front'
      }
    ]
  }
  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  function openSettingsWindow () {
    settingWindow.show()
  }

  function openCompanyWindow () {
    companyWindow.show()
  }

  function openPartyNoWindow () {
    partyNoWindow.show()
  }
}
app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

/**
 * Auto Updater
 *
 * Uncomment the following code below and install `electron-updater` to
 * support auto updating. Code Signing with a valid certificate is required.
 * https://simulatedgreg.gitbooks.io/electron-vue/content/en/using-electron-builder.html#auto-updating
 */

/*
import { autoUpdater } from 'electron-updater'

autoUpdater.on('update-downloaded', () => {
  autoUpdater.quitAndInstall()
})

app.on('ready', () => {
  if (process.env.NODE_ENV === 'production') autoUpdater.checkForUpdates()
})
 */
