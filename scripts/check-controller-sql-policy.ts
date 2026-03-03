#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(repoRoot, 'scripts/policies/controller-sql-baseline.json');
const scanRoots = [
  path.join(repoRoot, 'backend/src/controllers'),
  path.join(repoRoot, 'backend/src/modules'),
];

const controllerSqlPattern = /\b(?:pool|db|services\.pool)\.query\s*\(/g;

const strictZeroControllers = new Set([
  'backend/src/controllers/userController.ts',
  'backend/src/controllers/portalAuthController.ts',
  'backend/src/modules/accounts/controllers/accounts.controller.ts',
  'backend/src/modules/volunteers/controllers/volunteers.controller.ts',
  'backend/src/modules/tasks/controllers/tasks.controller.ts',
  'backend/src/modules/analytics/controllers/analytics.controller.ts',
  'backend/src/modules/reports/controllers/reports.controller.ts',
  'backend/src/modules/savedReports/controllers/savedReports.controller.ts',
  'backend/src/modules/scheduledReports/controllers/scheduledReports.controller.ts',
  'backend/src/modules/dashboard/controllers/dashboard.controller.ts',
  'backend/src/modules/followUps/controllers/followUps.controller.ts',
]);

if (!fs.existsSync(baselinePath)) {
  console.error(`Missing controller SQL baseline: ${path.relative(repoRoot, baselinePath)}`);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const observedCounts = {};
const violations = [];

const walkControllers = (dir) => {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkControllers(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;

    const relPath = path.relative(repoRoot, fullPath).split(path.sep).join('/');
    const isLegacyController = relPath.startsWith('backend/src/controllers/');
    const isModuleController =
      relPath.startsWith('backend/src/modules/') && relPath.includes('/controllers/');
    if (!isLegacyController && !isModuleController) {
      continue;
    }

    const source = fs.readFileSync(fullPath, 'utf8');
    controllerSqlPattern.lastIndex = 0;
    const count = (source.match(controllerSqlPattern) || []).length;
    observedCounts[relPath] = count;

    if (strictZeroControllers.has(relPath) && count > 0) {
      violations.push(`${relPath}: ${count} direct SQL query call(s) in strict-zero controller`);
    }

    if (!(relPath in baseline) && count > 0) {
      violations.push(`${relPath}: ${count} direct SQL query call(s) not present in baseline`);
    }
  }
};

scanRoots.forEach((root) => walkControllers(root));

for (const [file, allowedCount] of Object.entries(baseline)) {
  const actual = Number(observedCounts[file] || 0);
  if (actual > Number(allowedCount)) {
    violations.push(`${file}: ${actual} direct SQL query call(s), baseline allows ${allowedCount}`);
  }
}

if (violations.length > 0) {
  console.error('Controller SQL policy violations found. Move SQL access into services/repositories.');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Controller SQL policy check passed (baseline + strict-zero controllers).');
