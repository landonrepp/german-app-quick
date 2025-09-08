#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = join(__dirname, '..');

const standaloneDir = join(root, '.next', 'standalone');
const nextDir = join(root, '.next');
const staticSource = join(nextDir, 'static');
const staticTarget = join(standaloneDir, '.next', 'static');
// Server-side static (e.g., wasm) that standalone runtime expects relative to server root
const serverStaticSource = join(nextDir, 'server', 'static');
const serverChunksStaticSource = join(nextDir, 'server', 'chunks', 'static');
const serverStaticTarget = join(standaloneDir, '.next', 'server', 'static');
const publicSource = join(root, 'public');
const publicTarget = join(standaloneDir, 'public');

function ensureDir(path) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

if (!existsSync(standaloneDir)) {
  console.error('Standalone directory not found. Run `next build` with output=standalone first.');
  process.exit(1);
}

if (existsSync(staticSource)) {
  ensureDir(dirname(staticTarget));
  cpSync(staticSource, staticTarget, { recursive: true });
  console.log('Copied .next/static -> standalone/.next/static');
} else {
  console.warn('No .next/static directory found to copy.');
}

if (existsSync(serverStaticSource)) {
  ensureDir(serverStaticTarget);
  cpSync(serverStaticSource, serverStaticTarget, { recursive: true });
  console.log('Copied .next/server/static -> standalone/.next/server/static');
} else if (existsSync(serverChunksStaticSource)) {
  ensureDir(serverStaticTarget);
  cpSync(serverChunksStaticSource, serverStaticTarget, { recursive: true });
  console.log('Copied .next/server/chunks/static -> standalone/.next/server/static (fallback)');
} else {
  console.warn('No server static directories (.next/server/static or /chunks/static) found to copy.');
}

if (existsSync(publicSource)) {
  ensureDir(publicTarget);
  cpSync(publicSource, publicTarget, { recursive: true });
  console.log('Copied public -> standalone/public');
} else {
  console.warn('No public directory found to copy.');
}
