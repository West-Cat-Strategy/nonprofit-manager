#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');

const sourceFiles = walkFiles(path.join(repoRoot, 'backend/src'), {
  extensions: ['.ts'],
  includeTests: false,
});

const issues = [];

for (const filePath of sourceFiles) {
  const text = readText(filePath);
  if (!/express-validator/.test(text)) {
    continue;
  }

  const line = text.split(/\r?\n/).findIndex((lineText) => /express-validator/.test(lineText)) + 1;
  issues.push(`${relativeToRepo(filePath)}:${line} references express-validator in production source`);
}

if (issues.length > 0) {
  console.error('Express-validator policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Express-validator policy check passed (no production usage detected).');
