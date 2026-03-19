#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const activeRoots = [
  'README.md',
  'CONTRIBUTING.md',
  'agents.md',
  'backend/README.md',
  'frontend/README.md',
  'frontend/SETUP.md',
  'e2e/README.md',
  'database/README.md',
  'docs/README.md',
  'docs/INDEX.md',
  'docs/DOCUMENTATION_STYLE_GUIDE.md',
  'docs/development',
  'docs/testing',
  'docs/api',
  'docs/features',
  'docs/deployment',
  'docs/product',
  'docs/security',
  'docs/validation',
  'docs/quick-reference',
  'docs/THEME_SYSTEM.md',
];

const skipDirNames = new Set(['.git', '.next', 'coverage', 'dist', 'dist.bak', 'node_modules', 'output', 'tmp']);
const fileExtensions = new Set(['.md', '.markdown', '.html', '.htm']);
const apiV1AllowedFiles = new Set([
  'docs/deployment/LOG_AGGREGATION_SETUP.md',
  'docs/deployment/PLAUSIBLE_SETUP.md',
  'docs/product/PRODUCT_ANALYTICS_RESEARCH.md',
]);
const disallowedPatterns = [
  { pattern: /API Version:\s*v1\b/gi, label: 'API Version: v1' },
  { pattern: /\/api\/v1\b/gi, label: '/api/v1' },
  { pattern: /legacy\s+\/api\/\*/gi, label: 'legacy /api/*' },
];

function collectFiles(targetPath) {
  const abs = path.join(rootDir, targetPath);
  if (!fs.existsSync(abs)) return [];
  const stat = fs.statSync(abs);
  if (stat.isFile()) return [abs];

  const results = [];
  for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
    if (entry.isDirectory() && skipDirNames.has(entry.name)) continue;
    results.push(...collectFiles(path.join(targetPath, entry.name)));
  }
  return results;
}

const files = activeRoots.flatMap(collectFiles).filter((file) => fileExtensions.has(path.extname(file).toLowerCase()));
const violations = [];

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(rootDir, file);

  for (const { pattern, label } of disallowedPatterns) {
    if (label === '/api/v1' && apiV1AllowedFiles.has(rel)) {
      continue;
    }
    for (const match of text.matchAll(pattern)) {
      const line = text.slice(0, match.index).split('\n').length;
      violations.push(`${rel}:${line}: ${label}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Docs API versioning check failed:\n');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Checked ${files.length} active-doc files. No stale API-version references found.`);
