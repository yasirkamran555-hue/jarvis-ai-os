import { app, BrowserWindow, dialog, screen } from 'electron';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const backendUrl = 'http://127.0.0.1:4000';
let backendProcess;

function delay(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function isBackendReady() {
  try {
    const response = await fetch(`${backendUrl}/api/health`, {
      signal: AbortSignal.timeout(1000)
    });
    if (!response.ok) return false;

    const health = await response.json();
    return health.ok === true && health.service === 'jarvis-ai-os-backend';
  } catch {
    return false;
  }
}

async function ensureBackend() {
  if (await isBackendReady()) return;

  const backendPath = path.join(projectRoot, 'backend', 'server.js');
  backendProcess = spawn(process.execPath, [backendPath], {
    cwd: projectRoot,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });

  backendProcess.stdout.on('data', data => console.log(`[backend] ${data.toString().trimEnd()}`));
  backendProcess.stderr.on('data', data => console.error(`[backend] ${data.toString().trimEnd()}`));
  backendProcess.on('error', error => console.error('Could not start the JARVIS backend:', error));
  backendProcess.on('exit', (code, signal) => {
    console.log(`JARVIS backend exited (code: ${code}, signal: ${signal}).`);
    backendProcess = undefined;
  });

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await isBackendReady()) return;
    if (backendProcess.exitCode !== null) {
      throw new Error(`The backend exited before becoming ready (code ${backendProcess.exitCode}).`);
    }
    await delay(500);
  }

  throw new Error('The backend did not become ready within 15 seconds.');
}

function createWindow() {
  const { width: availableWidth, height: availableHeight } = screen.getPrimaryDisplay().workAreaSize;
  const width = Math.min(1400, availableWidth);
  const height = Math.min(980, availableHeight);
  const win = new BrowserWindow({
    width,
    height,
    minWidth: Math.min(900, width),
    minHeight: Math.min(620, height),
    center: true,
    backgroundColor: '#020817',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  const isDev = process.env.ELECTRON_START === '1';
  const pageLoad = isDev
    ? win.loadURL('http://localhost:5173')
    : win.loadFile(path.join(__dirname, '../frontend/dist/index.html'));

  pageLoad.catch(error => {
    console.error('Could not open the JARVIS app window:', error);
    dialog.showErrorBox('JARVIS AI OS could not open', error.message);
    if (!win.isDestroyed()) win.destroy();
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('JARVIS app renderer stopped unexpectedly:', details);
  });

  if (isDev) win.webContents.openDevTools({ mode: 'detach' });
  return win;
}

app.whenReady().then(async () => {
  try {
    await ensureBackend();
    createWindow();
  } catch (error) {
    console.error('JARVIS startup failed:', error);
    dialog.showErrorBox('JARVIS AI OS could not start', error.message);
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  if (backendProcess && backendProcess.exitCode === null) {
    backendProcess.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
