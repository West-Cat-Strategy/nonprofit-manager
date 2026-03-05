#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const modulesRoot = path.join(repoRoot, 'backend/src/modules');

const excludedModules = new Set([
  'shared',
]);

const migratedModules = fs
  .readdirSync(modulesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((moduleName) => !excludedModules.has(moduleName))
  .sort();

const legacyControllerPatterns = [
  /from\s+['"]@controllers\//g,
  /from\s+['"](?:\.\.\/){2,}controllers\//g,
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
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;

    const source = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of legacyControllerPatterns) {
      pattern.lastIndex = 0;
      if (pattern.test(source)) {
        violations.push(path.relative(repoRoot, fullPath).split(path.sep).join('/'));
        break;
      }
    }
  }
};

for (const moduleName of migratedModules) {
  walkTypeScript(path.join(modulesRoot, moduleName));
}

if (violations.length > 0) {
  console.error('Module boundary policy violations found. Module domains must not import legacy controllers.');
  for (const violation of [...new Set(violations)].sort()) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Module boundary policy check passed for module domains.');
