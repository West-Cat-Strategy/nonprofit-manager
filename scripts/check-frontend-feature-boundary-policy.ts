#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const featuresRoot = path.join(repoRoot, 'frontend/src/features');
const baselinePath = path.join(
  repoRoot,
  'scripts/policies/frontend-feature-page-import-baseline.json'
);

if (!fs.existsSync(baselinePath)) {
  console.error(
    `Missing frontend feature boundary baseline: ${path.relative(repoRoot, baselinePath)}`
  );
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const observed = {};
const violations = [];

const importPatterns = [
  /from\s+['"](?:\.\.\/)+pages\//g,
  /import\(\s*['"](?:\.\.\/)+pages\//g,
];

const walk = (dir) => {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    if (!entry.isFile() || !fullPath.includes(`${path.sep}pages${path.sep}`)) continue;
    if (!entry.name.endsWith('.ts') && !entry.name.endsWith('.tsx')) continue;

    const rel = path.relative(repoRoot, fullPath).split(path.sep).join('/');
    const source = fs.readFileSync(fullPath, 'utf8');
    const count = importPatterns.reduce((total, pattern) => total + (source.match(pattern) || []).length, 0);

    observed[rel] = count;
    if (!(rel in baseline) && count > 0) {
      violations.push(`${rel}: ${count} legacy pages import(s), not in baseline`);
      continue;
    }

    const allowed = Number(baseline[rel] || 0);
    if (count > allowed) {
      violations.push(`${rel}: ${count} legacy pages import(s), baseline allows ${allowed}`);
    }
  }
};

walk(featuresRoot);

if (violations.length > 0) {
  console.error(
    'Frontend feature boundary policy violations found. Reduce feature-page imports from legacy pages paths.'
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Frontend feature boundary policy check passed (baseline ratchet).');
