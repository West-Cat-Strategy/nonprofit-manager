#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(repoRoot, 'scripts/policies/success-envelope-baseline.json');
const scanRoots = [
  path.join(repoRoot, 'backend/src/controllers'),
  path.join(repoRoot, 'backend/src/modules'),
];

const DIRECT_SUCCESS_REGEX = [
  /\bres\.json\s*\(/g,
  /\bres\.status\s*\(\s*20[0-9]\s*\)\s*\.json\s*\(/g,
];

const STRICT_ZERO_CONTROLLERS = new Set([
  'backend/src/controllers/adminBrandingController.ts',
  'backend/src/controllers/adminStatsController.ts',
  'backend/src/controllers/caseController.ts',
  'backend/src/controllers/outcomeDefinitionController.ts',
  'backend/src/controllers/outcomeReportController.ts',
  'backend/src/controllers/taskController.ts',
  'backend/src/controllers/userController.ts',
  'backend/src/controllers/mfaController.ts',
  'backend/src/controllers/portalAuthController.ts',
  'backend/src/controllers/paymentController.ts',
  'backend/src/controllers/publishingController.ts',
  'backend/src/controllers/templateController.ts',
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

const PROVIDER_ACK_EXCEPTIONS = new Set([
  // Provider webhook handlers must use sendProviderAck(...) and set skipSuccessEnvelope,
  // not direct 2xx res.json(...) responses.
  'backend/src/modules/payments/controllers/paymentController.ts',
  'backend/src/controllers/mailchimpController.ts',
]);

if (!fs.existsSync(baselinePath)) {
  console.error(`Missing success envelope baseline: ${path.relative(repoRoot, baselinePath)}`);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const violations = [];
const observedCounts = {};

const countDirectSuccessCalls = (source) =>
  DIRECT_SUCCESS_REGEX.reduce((total, pattern) => total + (source.match(pattern) || []).length, 0);

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
    observedCounts[relPath] = countDirectSuccessCalls(source);

    if (STRICT_ZERO_CONTROLLERS.has(relPath) && observedCounts[relPath] > 0) {
      violations.push(`${relPath}: ${observedCounts[relPath]} direct 2xx JSON response call(s) in strict controller`);
    }

    if (!(relPath in baseline) && observedCounts[relPath] > 0) {
      violations.push(`${relPath}: ${observedCounts[relPath]} direct 2xx JSON response call(s) not present in baseline`);
    }
  }
};

scanRoots.forEach((root) => walkControllers(root));

for (const [file, allowedCount] of Object.entries(baseline)) {
  const actual = Number(observedCounts[file] || 0);
  if (actual > Number(allowedCount)) {
    violations.push(`${file}: ${actual} direct 2xx JSON response call(s), baseline allows ${allowedCount}`);
  }
}

for (const file of PROVIDER_ACK_EXCEPTIONS) {
  const fullPath = path.join(repoRoot, file);
  if (!fs.existsSync(fullPath)) continue;
  const source = fs.readFileSync(fullPath, 'utf8');
  const usesProviderAck = /\bsendProviderAck\s*\(/.test(source);
  if (!usesProviderAck) {
    violations.push(`${file}: missing sendProviderAck(...) provider webhook ack usage`);
  }
}

if (violations.length > 0) {
  console.error(
    'Success envelope policy violations found. Keep controller direct success responses at or below baseline and use sendSuccess()/created()/noContent() in strict controllers.'
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Success envelope policy check passed (baseline + strict controller enforcement).');
