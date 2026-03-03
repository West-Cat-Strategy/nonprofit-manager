#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

const scanRoots = [
  path.join(repoRoot, 'backend/src/controllers'),
  path.join(repoRoot, 'backend/src/routes'),
  path.join(repoRoot, 'backend/src/modules'),
];

const legacyValidationPattern =
  /\bfrom\s+['"]express-validator['"]|\brequire\s*\(\s*['"]express-validator['"]\s*\)|\bvalidationResult\s*\(/g;

const violations = [];

const walk = (dir) => {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;

    const source = fs.readFileSync(fullPath, 'utf8');
    legacyValidationPattern.lastIndex = 0;
    if (!legacyValidationPattern.test(source)) continue;

    const relPath = path.relative(repoRoot, fullPath).split(path.sep).join('/');
    violations.push(relPath);
  }
};

for (const root of scanRoots) {
  walk(root);
}

if (violations.length > 0) {
  console.error('Legacy express-validator usage detected. Use Zod validation middleware instead.');
  for (const file of violations.sort()) {
    console.error(`- ${file}`);
  }
  process.exit(1);
}

console.log('Express-validator policy check passed (no production usage detected).');
