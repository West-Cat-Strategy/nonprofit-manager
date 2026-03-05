#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

const forbiddenLegacyControllerWrappers = [
  'backend/src/controllers/analyticsController.ts',
  'backend/src/controllers/dashboardController.ts',
  'backend/src/controllers/followUpController.ts',
  'backend/src/controllers/outcomeReportController.ts',
  'backend/src/controllers/reportController.ts',
  'backend/src/controllers/reportSharingController.ts',
  'backend/src/controllers/reportTemplateController.ts',
  'backend/src/controllers/savedReportController.ts',
  'backend/src/controllers/scheduledReportController.ts',
  'backend/src/controllers/domains/portal/casePortalConversationsController.ts',
];

const violations = forbiddenLegacyControllerWrappers.filter((relPath) =>
  fs.existsSync(path.join(repoRoot, relPath))
);

if (violations.length > 0) {
  console.error(
    'Backend legacy controller wrapper policy violations found. Scoped migrated domains must remain module-owned.'
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Backend legacy controller wrapper policy check passed for scoped migrated domains.');
