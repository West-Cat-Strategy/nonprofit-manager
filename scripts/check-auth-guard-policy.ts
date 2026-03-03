#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(repoRoot, 'scripts/policies/legacy-auth-guard-baseline.json');

const legacyGuardPattern =
  /\b(requireUserOrError|requireRoleOrError|requirePermissionOrError|requireAnyPermissionOrError|requireOrganizationOrError)\s*\(/g;

const scanRoots = [
  path.join(repoRoot, 'backend/src/controllers'),
  path.join(repoRoot, 'backend/src/routes'),
  path.join(repoRoot, 'backend/src/modules'),
];

const skipPaths = new Set([
  'backend/src/services/authGuardService.ts',
]);

const baseline = fs.existsSync(baselinePath)
  ? JSON.parse(fs.readFileSync(baselinePath, 'utf8'))
  : {};

const currentCounts = {};

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;

    const relPath = path.relative(repoRoot, fullPath).split(path.sep).join('/');
    if (skipPaths.has(relPath)) continue;

    const source = fs.readFileSync(fullPath, 'utf8');
    const count = (source.match(legacyGuardPattern) || []).length;
    if (count > 0) {
      currentCounts[relPath] = count;
    }
  }
};

for (const root of scanRoots) {
  if (fs.existsSync(root)) {
    walk(root);
  }
}

const violations = [];

for (const [file, count] of Object.entries(currentCounts)) {
  if (!(file in baseline)) {
    violations.push(`${file}: ${count} legacy auth-guard helper usage(s) not in baseline`);
    continue;
  }

  const allowed = Number(baseline[file]);
  if (count > allowed) {
    violations.push(`${file}: ${count} usage(s), baseline allows ${allowed}`);
  }
}

if (violations.length > 0) {
  console.error('Legacy auth-guard policy violations found. Prefer require*Safe/require*Strict helpers.');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Legacy auth-guard policy check passed (no usage increase).');
