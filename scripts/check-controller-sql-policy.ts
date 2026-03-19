#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');

const baseline = 80;
const controllerRoots = [
  path.join(repoRoot, 'backend/src/controllers'),
  path.join(repoRoot, 'backend/src/modules'),
];
const sourceFiles = walkFiles(controllerRoots, {
  extensions: ['.ts'],
  includeTests: false,
  filter: (filePath) => /\/controllers\//.test(filePath),
});

let count = 0;
const byFile = [];

for (const filePath of sourceFiles) {
  const text = readText(filePath);
  const matches = text.match(/\.query\(/g) || [];
  if (matches.length === 0) {
    continue;
  }

  count += matches.length;
  byFile.push(`${relativeToRepo(filePath)}: ${matches.length}`);
}

if (count > baseline) {
  console.error('Controller SQL policy check failed:\n');
  console.error(`- Found ${count} direct .query( calls in controller files, baseline is ${baseline}.`);
  for (const line of byFile) {
    console.error(`- ${line}`);
  }
  process.exit(1);
}

console.log('Controller SQL policy check passed (baseline + strict-zero controllers).');
