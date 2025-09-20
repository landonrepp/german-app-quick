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
const tauriEmbedTarget = join(root, 'src-tauri', 'next-standalone');

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

// Ensure a placeholder index.html exists for Tauri distDir initial load before server redirect
try {
  const placeholder = join(standaloneDir, 'index.html');
  if (!existsSync(placeholder)) {
    const html = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>Loading...</title><script>setTimeout(()=>location.replace("http://127.0.0.1:3333"),100);</script></head><body><p>Starting internal server...</p></body></html>';
    await (await import('node:fs/promises')).writeFile(placeholder, html, 'utf8');
    console.log('Created placeholder standalone/index.html');
  }
} catch (e) {
  console.warn('Could not create placeholder index.html', e);
}

// Copy entire standalone dir for Tauri embedding (so build script finds it before runtime extraction)
try {
  ensureDir(tauriEmbedTarget);
  cpSync(standaloneDir, tauriEmbedTarget, { recursive: true });
  console.log('Mirrored standalone -> src-tauri/next-standalone');
} catch (e) {
  console.warn('Failed to mirror standalone for Tauri embedding', e);
}
