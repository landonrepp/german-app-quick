/* eslint-disable @typescript-eslint/no-var-requires */
// Electron main process that launches Next.js in production
const { app, BrowserWindow, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const next = require('next');

const IS_DEV = !!process.env.ELECTRON_DEV || process.env.NODE_ENV === 'development';
if (!IS_DEV) {
  // Ensure a standard env for Next.js in production
  process.env.NODE_ENV = 'production';
}
const DEV_PORT = 3000;
const PORT = Number(process.env.PORT || (IS_DEV ? DEV_PORT : 3333));
let mainWindow = null;
let server = null;
let nextChild = null;

async function startNextServer() {
  const appDir = path.resolve(__dirname, '..');
  // Prefer unpacked .next/standalone if present to avoid asar ENOTDIR
  let standaloneServer = path.join(appDir, '.next', 'standalone', 'server.js');
  let spawnCwd = appDir;
  try {
    const appPath = app.getAppPath(); // e.g. /.../Resources/app.asar
    const resourcesDir = path.dirname(appPath);
    const unpackedDir = path.join(resourcesDir, 'app.asar.unpacked');
    const unpackedServer = path.join(unpackedDir, '.next', 'standalone', 'server.js');
    if (fs.existsSync(unpackedServer)) {
      standaloneServer = unpackedServer;
      spawnCwd = unpackedDir;
    }
  } catch {}

  if (fs.existsSync(standaloneServer)) {
    // Run standalone Next server in a child process so we can pipe logs to stdout/stderr
    const env = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      HOSTNAME: 'localhost',
      ELECTRON_RUN_AS_NODE: '1',
    };
    nextChild = spawn(process.execPath, [standaloneServer], {
      env,
      cwd: spawnCwd,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    nextChild.stdout.on('data', (chunk) => {
      const msg = chunk.toString();
      console.log(`[next] ${msg.trimEnd()}`);
    });
    nextChild.stderr.on('data', (chunk) => {
      const msg = chunk.toString();
      console.error(`[next] ${msg.trimEnd()}`);
    });
    nextChild.on('exit', (code, signal) => {
      console.error(`Next server exited (code=${code}, signal=${signal})`);
    });

    // Poll the port until it's accepting connections
    await new Promise((resolve, reject) => {
      const start = Date.now();
      const timeoutMs = 15000;
      const attempt = () => {
        const req = http.get({ host: '127.0.0.1', port: PORT, path: '/' }, (res) => {
          res.resume();
          resolve(undefined);
        });
        req.on('error', () => {
          if (Date.now() - start > timeoutMs) reject(new Error('Next server failed to start'));
          else setTimeout(attempt, 250);
        });
      };
      attempt();
    });
    return null; // using child process, no in-proc http server
  }

  // Fallback: run Next in-process
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
  // Ensure cwd is the app root so relative paths (e.g. ./migrations) work in production
  const appRoot = path.resolve(__dirname, '..');
  try { process.chdir(appRoot); } catch {}
  process.env.APP_ROOT = appRoot;

  // Minimal log file to help debug packaged runs
  try {
    const logPath = path.join(app.getPath('userData'), 'electron.log');
    const logStream = fs.createWriteStream(logPath, { flags: 'a' });
    const write = (level, args) => {
      const ts = new Date().toISOString();
      logStream.write(`[${ts}] [${level}] ${args.map((a) => {
        try { return typeof a === 'string' ? a : JSON.stringify(a); } catch { return String(a); }
      }).join(' ')}\n`);
    };
    const origLog = console.log.bind(console);
    const origErr = console.error.bind(console);
    console.log = (...args) => { write('LOG', args); origLog(...args); };
    console.error = (...args) => { write('ERR', args); origErr(...args); };
    console.log('Electron app starting. APP_ROOT:', appRoot, 'PORT:', PORT, 'IS_DEV:', IS_DEV);
  } catch {/* ignore logging setup errors */}

  // Use a stable per-user DB path for SQLite in packaged app
  const userDb = path.join(app.getPath('userData'), 'db.sqlite');
  process.env.SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || userDb;
  process.env.SQLITE_VERBOSE = process.env.SQLITE_VERBOSE || '1';

  // In dev, assume Next dev server already runs on 3000
  if (!IS_DEV) {
    try {
      await startNextServer();
      console.log('Next.js server started on port', PORT);
    } catch (err) {
      console.error('Failed to start Next.js server:', err);
      app.quit();
      return;
    }
  }

  createMainWindow();
}).catch((err) => {
  console.error('Failed to start app:', err);
  app.quit();
});

app.on('before-quit', () => {
  try { if (server) server.close(); } catch {}
  try { if (nextChild) nextChild.kill(); } catch {}
});
