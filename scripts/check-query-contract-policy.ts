#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');

const baseline = 162;
const sourceRoots = [
  path.join(repoRoot, 'backend/src/controllers'),
  path.join(repoRoot, 'backend/src/modules'),
];
const sourceFiles = walkFiles(sourceRoots, {
  extensions: ['.ts'],
  includeTests: false,
  filter: (filePath) => /\/controllers\/|\/controllers\//.test(filePath),
});

let count = 0;
const byFile = [];

for (const filePath of sourceFiles) {
  const text = readText(filePath);
  const matches = text.match(/\breq\.query\b/g) || [];
  if (matches.length === 0) {
    continue;
  }

  count += matches.length;
  byFile.push(`${relativeToRepo(filePath)}: ${matches.length}`);
}

if (count > baseline) {
  console.error('Query contract policy check failed:\n');
  console.error(`- Found ${count} direct req.query usages, baseline is ${baseline}.`);
  for (const line of byFile) {
    console.error(`- ${line}`);
  }
  process.exit(1);
}

console.log('Query contract policy check passed.');
