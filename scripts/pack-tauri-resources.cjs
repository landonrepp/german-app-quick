#!/usr/bin/env node
// Copy Next standalone output into src-tauri/next so Tauri bundles it.
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const nextStandalone = path.join(root, '.next', 'standalone');
const nextStatic = path.join(root, '.next', 'static');
const destBase = path.join(root, 'src-tauri', '.next');
const destCompatStatic = path.join(root, 'src-tauri', 'static');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

const ok1 = copyDir(nextStandalone, path.join(destBase, 'standalone'));
const ok2 = copyDir(nextStatic, path.join(destBase, 'static'));
// Compatibility copy for servers that resolve ../../static
const ok3 = copyDir(nextStatic, destCompatStatic);

if (!ok1) {
  console.error('Pack step: .next/standalone not found. Did Next build with output=standalone?');
  process.exitCode = 1;
}
