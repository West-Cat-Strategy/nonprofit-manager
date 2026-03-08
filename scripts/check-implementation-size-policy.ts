#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(repoRoot, 'scripts/policies/implementation-size-baseline.json');
const maxLines = 900;

if (!fs.existsSync(baselinePath)) {
  console.error(
    `Missing implementation size baseline: ${path.relative(repoRoot, baselinePath)}`
  );
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const roots = ['backend/src', 'frontend/src'].map((relativePath) => path.join(repoRoot, relativePath));
const violations = [];

const isImplementationFile = (fullPath) => {
  if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) {
    return false;
  }

  const rel = path.relative(repoRoot, fullPath).split(path.sep).join('/');
  const base = path.basename(fullPath);

  if (rel.includes('/__tests__/') || /\.test\.[tj]sx?$/.test(base) || /\.spec\.[tj]sx?$/.test(base)) {
    return false;
  }
  if (rel.includes('/types/') || rel.includes('/validations/')) {
    return false;
  }
  if (/^(constants|index)\.[tj]sx?$/.test(base)) {
    return false;
  }

  return true;
};

const walk = (dir) => {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !isImplementationFile(fullPath)) {
      continue;
    }

    const rel = path.relative(repoRoot, fullPath).split(path.sep).join('/');
    const lineCount = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/).length;

    if (lineCount <= maxLines) {
      continue;
    }

    if (!(rel in baseline)) {
      violations.push(`${rel}: ${lineCount} lines exceeds ${maxLines} and is not in baseline`);
      continue;
    }

    const allowed = Number(baseline[rel] || 0);
    if (lineCount > allowed) {
      violations.push(`${rel}: ${lineCount} lines exceeds baseline ${allowed}`);
    }
  }
};

roots.forEach(walk);

if (violations.length > 0) {
  console.error(
    `Implementation size policy violations found. Keep implementation files at or below ${maxLines} lines unless already baselined.`
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Implementation size policy check passed.');
