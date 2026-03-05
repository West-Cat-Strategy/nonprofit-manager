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

const violations = [];

for (const moduleName of migratedModules) {
  const routeFile = path.join(repoRoot, 'backend/src/modules', moduleName, 'routes/index.ts');
  if (!fs.existsSync(routeFile)) {
    violations.push(`${path.relative(repoRoot, routeFile)}: missing route entrypoint`);
    continue;
  }

  const source = fs.readFileSync(routeFile, 'utf8');
  if (/from\s+['"]@routes\//.test(source)) {
    violations.push(`${path.relative(repoRoot, routeFile)}: imports @routes/* proxy`);
  }
}

if (violations.length > 0) {
  console.error('Module route proxy policy violations found. Module routes must not import @routes/*.');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Module route proxy policy check passed for module domains.');
