#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  walkFiles,
} = require('./lib/policy-utils.ts');

const rootTests = walkFiles(path.join(repoRoot, 'backend/src/__tests__'), {
  extensions: ['.ts'],
  includeTests: true,
  filter: (filePath) => !filePath.includes(`${path.sep}integration${path.sep}`),
});

const moduleTests = walkFiles(path.join(repoRoot, 'backend/src/modules'), {
  extensions: ['.ts'],
  includeTests: true,
  filter: (filePath) => /\/__tests__\//.test(filePath),
});

const rootBasenames = new Map();
const moduleBasenames = new Map();

for (const filePath of rootTests) {
  rootBasenames.set(path.basename(filePath), filePath);
}

for (const filePath of moduleTests) {
  moduleBasenames.set(path.basename(filePath), filePath);
}

const collisions = [];
for (const [basename, rootPath] of rootBasenames.entries()) {
  const modulePath = moduleBasenames.get(basename);
  if (modulePath) {
    collisions.push(`${basename}: ${relativeToRepo(rootPath)} <-> ${relativeToRepo(modulePath)}`);
  }
}

if (collisions.length > 0) {
  console.error('Duplicate test tree check failed:\n');
  for (const collision of collisions) {
    console.error(`- ${collision}`);
  }
  process.exit(1);
}

console.log('Duplicate test tree check passed.');
