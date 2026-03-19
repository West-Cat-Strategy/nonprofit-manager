#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');

const baseline = 3;
const sourceFiles = walkFiles(path.join(repoRoot, 'backend/src'), {
  extensions: ['.ts'],
  includeTests: false,
});
const pattern = /res\.json\(\s*{\s*success:\s*true,\s*data:/gs;

let count = 0;
const matches = [];

for (const filePath of sourceFiles) {
  const text = readText(filePath);
  for (const match of text.matchAll(pattern)) {
    count += 1;
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    matches.push(`${relativeToRepo(filePath)}:${line}`);
  }
}

if (count > baseline) {
  console.error('Success envelope policy check failed:\n');
  console.error(`- Found ${count} direct success-envelope literals, baseline is ${baseline}.`);
  for (const match of matches) {
    console.error(`- ${match}`);
  }
  process.exit(1);
}

console.log('Success envelope policy check passed (baseline + strict controller enforcement).');
