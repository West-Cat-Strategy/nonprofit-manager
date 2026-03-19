#!/usr/bin/env node

const path = require('path');
const {
  lineCount,
  readBaselineJson,
  relativeToRepo,
  repoRoot,
  walkFiles,
} = require('./lib/policy-utils.ts');

const baselinePath = 'scripts/baselines/implementation-size.json';
const baseline = readBaselineJson(baselinePath);

if (!baseline || typeof baseline !== 'object' || !baseline.files || typeof baseline.cap !== 'number') {
  console.error(`Implementation size policy baseline is missing or invalid: ${baselinePath}`);
  process.exit(1);
}

const cap = baseline.cap;
const baselineFiles = new Map(
  Object.entries(baseline.files).map(([filePath, lineTotal]) => [filePath, Number(lineTotal)])
);

const sourceFiles = walkFiles([path.join(repoRoot, 'backend/src'), path.join(repoRoot, 'frontend/src')], {
  extensions: ['.ts', '.tsx'],
  includeTests: false,
});

const issues = [];

for (const filePath of sourceFiles) {
  const relativePath = relativeToRepo(filePath);
  const currentLines = lineCount(filePath);
  const baselineLines = baselineFiles.get(relativePath);

  if (baselineLines == null) {
    if (currentLines > cap) {
      issues.push(`${relativePath}: ${currentLines} lines exceeds the ${cap}-line cap`);
    }
    continue;
  }

  if (currentLines > baselineLines) {
    issues.push(`${relativePath}: ${currentLines} lines exceeds baseline ${baselineLines}`);
  }
}

if (issues.length > 0) {
  console.error('Implementation size policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Implementation size policy check passed.');
