/* eslint-disable @typescript-eslint/no-var-requires */
// Electron main process that launches Next.js in production
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');
const next = require('next');

const PORT = Number(process.env.PORT || 3333);
let mainWindow = null;
let server = null;

async function startNextServer() {
  const appDir = path.resolve(__dirname, '..');
  const nextApp = next({ dev: false, dir: appDir });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => handle(req, res));
    server.listen(PORT, (err) => {
      if (err) reject(err);
      else resolve(server);
    });
  });
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => mainWindow && mainWindow.show());

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createMainWindow();
});

app.whenReady().then(async () => {
  // Use a stable per-user DB path for SQLite in packaged app
  const userDb = path.join(app.getPath('userData'), 'db.sqlite');
  process.env.SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || userDb;
  await startNextServer();
  createMainWindow();
}).catch((err) => {
  console.error('Failed to start app:', err);
  app.quit();
});

app.on('before-quit', () => {
  try { if (server) server.close(); } catch {}
});

