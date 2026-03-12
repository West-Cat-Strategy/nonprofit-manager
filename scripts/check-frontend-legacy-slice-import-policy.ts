#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const featuresRoot = path.join(repoRoot, 'frontend/src/features');

const migratedDomains = new Set([
  'accounts',
  'analytics',
  'builder',
  'cases',
  'contacts',
  'engagement',
  'dashboard',
  'finance',
  'followUps',
  'reports',
  'savedReports',
  'scheduledReports',
  'tasks',
  'volunteers',
]);

const importPatterns = [
  /from\s+['"][^'"]*store\/slices\//g,
  /import\(\s*['"][^'"]*store\/slices\//g,
];

const violations = [];

const walkTypeScript = (dir) => {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTypeScript(fullPath);
      continue;
    }

    if (!entry.isFile()) continue;
    if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) continue;

    const relPath = path.relative(repoRoot, fullPath).split(path.sep).join('/');
    const source = fs.readFileSync(fullPath, 'utf8');
    const count = importPatterns.reduce(
      (total, pattern) => total + (source.match(pattern) || []).length,
      0
    );

    if (count > 0) {
      violations.push(`${relPath}: ${count} legacy store/slices import(s)`);
    }
  }
};

for (const domain of migratedDomains) {
  walkTypeScript(path.join(featuresRoot, domain));
}

if (violations.length > 0) {
  console.error(
    'Frontend legacy slice import policy violations found. Migrated feature domains must not import frontend/src/store/slices/*.'
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Frontend legacy slice import policy check passed for migrated feature domains.');
