import '@testing-library/jest-dom';

// Ensure Jest uses an isolated SQLite DB per worker
// before any test imports modules that open the DB.
(() => {
  try {
    const fs = require('fs') as typeof import('fs');
    const path = require('path') as typeof import('path');
    const worker = process.env.JEST_WORKER_ID || '0';
    const tmpDir = path.resolve('.tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
    const dbPath = path.join(tmpDir, `jest-db-${worker}.sqlite`);
    process.env.SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || dbPath;
    // Fresh DB for each test file within this worker
    try { if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); } catch {}
  } catch {}
})();
