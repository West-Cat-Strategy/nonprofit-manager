#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
} = require('./lib/policy-utils.ts');

const filePath = path.join(repoRoot, 'backend/src/routes/v2/index.ts');
const allowedPrefixes = [
  'express',
  '@middleware/',
  '@modules/',
  '@app-types/',
];
const disallowedPrefixes = [
  '@routes/',
  '@controllers/',
];
const text = readText(filePath);
const importPattern = /(?:import|export)\s+[^'";]*?\s+from\s+['"]([^'"]+)['"]|require\(\s*['"]([^'"]+)['"]\s*\)/g;
const issues = [];

for (const match of text.matchAll(importPattern)) {
  const specifier = match[1] || match[2];
  if (!specifier) {
    continue;
  }

  if (disallowedPrefixes.some((prefix) => specifier.startsWith(prefix))) {
    const line = text.slice(0, match.index).split(/\r?\n/).length;
    issues.push(`${relativeToRepo(filePath)}:${line} imports disallowed ${specifier}`);
    continue;
  }

  if (
    allowedPrefixes.some((prefix) => specifier === prefix || specifier.startsWith(prefix)) ||
    !specifier.startsWith('@')
  ) {
    continue;
  }

  const line = text.slice(0, match.index).split(/\r?\n/).length;
  issues.push(`${relativeToRepo(filePath)}:${line} imports unexpected ${specifier}`);
}

if (issues.length > 0) {
  console.error('V2 module ownership policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('V2 module ownership policy check passed.');
