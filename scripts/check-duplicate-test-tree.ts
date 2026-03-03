#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const duplicateTestRoot = path.join(repoRoot, 'backend/backend/src/__tests__');

if (!fs.existsSync(duplicateTestRoot)) {
  console.log('Duplicate test tree check passed.');
  process.exit(0);
}

const collected = [];

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (entry.isFile()) {
      collected.push(path.relative(repoRoot, fullPath).split(path.sep).join('/'));
    }
  }
};

walk(duplicateTestRoot);

if (collected.length === 0) {
  console.log('Duplicate test tree check passed.');
  process.exit(0);
}

console.error('Duplicate backend test tree detected under backend/backend/src/__tests__.');
for (const file of collected) {
  console.error(`- ${file}`);
}
console.error('Remove duplicate files and keep tests under backend/src/__tests__.');
process.exit(1);
