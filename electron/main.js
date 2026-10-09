import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

ipcMain.handle('browser:open-youtube', async (event) => {
  const parent = BrowserWindow.fromWebContents(event.sender);
  const browserWindow = new BrowserWindow({
    parent,
    width: 1280,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'YouTube',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  try {
    await browserWindow.loadURL('https://www.youtube.com/');
  } catch (error) {
    browserWindow.destroy();
    throw error;
  }
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 980,
    minWidth: 1100,
    minHeight: 760,
    backgroundColor: '#020817',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const isDev = process.env.ELECTRON_START === '1';
  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '../frontend/dist/index.html');
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
