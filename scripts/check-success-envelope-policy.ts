#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const controllersRoot = path.join(repoRoot, 'backend', 'src', 'controllers');
const baselinePath = path.join(
  repoRoot,
  'scripts',
  'policies',
  'success-envelope-baseline.json'
);

const DIRECT_SUCCESS_REGEX = [
  /\bres\.json\s*\(/g,
  /\bres\.status\s*\(\s*20[0-9]\s*\)\s*\.json\s*\(/g,
];

const currentCounts = {};

const countMatches = (source) => {
  return DIRECT_SUCCESS_REGEX.reduce((total, pattern) => total + (source.match(pattern) || []).length, 0);
};

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;

    const source = fs.readFileSync(fullPath, 'utf8');
    const matches = countMatches(source);
    if (matches === 0) continue;

    const relativePath = path.relative(repoRoot, fullPath);
    currentCounts[relativePath] = matches;
  }
};

if (!fs.existsSync(baselinePath)) {
  console.error(`Missing success-envelope baseline at ${path.relative(repoRoot, baselinePath)}.`);
  process.exit(1);
}

const baselineCounts = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));

walk(controllersRoot);

const violations = [];
for (const [file, count] of Object.entries(currentCounts)) {
  const baseline = baselineCounts[file];
  if (baseline === undefined) {
    violations.push(`${file}: ${count} direct success response call(s) (no baseline entry)`);
    continue;
  }

  if (count > baseline) {
    violations.push(`${file}: ${count} direct success response call(s) exceeds baseline ${baseline}`);
  }
}

if (violations.length > 0) {
  console.error(
    'Success envelope policy violations found. Use sendSuccess(...) or reduce direct 2xx res.json() usage.'
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Success envelope policy check passed.');
