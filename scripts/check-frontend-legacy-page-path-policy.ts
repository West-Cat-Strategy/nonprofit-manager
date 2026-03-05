#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

const forbiddenLegacyPageFiles = [
  'frontend/src/pages/analytics/Analytics.tsx',
  'frontend/src/pages/analytics/CustomDashboard.tsx',
  'frontend/src/pages/analytics/OutcomesReport.tsx',
  'frontend/src/pages/analytics/ReportBuilder.tsx',
  'frontend/src/pages/analytics/ReportTemplates.tsx',
  'frontend/src/pages/analytics/SavedReports.tsx',
  'frontend/src/pages/analytics/ScheduledReports.tsx',
  'frontend/src/pages/analytics/charts.tsx',
  'frontend/src/pages/analytics/metrics.tsx',
  'frontend/src/pages/analytics/utils.ts',
  'frontend/src/pages/engagement/cases/CaseCreate.tsx',
  'frontend/src/pages/engagement/cases/CaseDetail.tsx',
  'frontend/src/pages/engagement/cases/CaseEdit.tsx',
  'frontend/src/pages/engagement/cases/CaseList.tsx',
  'frontend/src/pages/engagement/tasks/TaskCreate.tsx',
  'frontend/src/pages/engagement/tasks/TaskDetail.tsx',
  'frontend/src/pages/engagement/tasks/TaskEdit.tsx',
  'frontend/src/pages/engagement/tasks/TaskList.tsx',
  'frontend/src/pages/engagement/followUps/FollowUpsPage.tsx',
  'frontend/src/pages/people/accounts/AccountCreate.tsx',
  'frontend/src/pages/people/accounts/AccountDetail.tsx',
  'frontend/src/pages/people/accounts/AccountEdit.tsx',
  'frontend/src/pages/people/accounts/AccountList.tsx',
  'frontend/src/pages/people/contacts/ContactCreate.tsx',
  'frontend/src/pages/people/contacts/ContactDetail.tsx',
  'frontend/src/pages/people/contacts/ContactEdit.tsx',
  'frontend/src/pages/people/contacts/ContactList.tsx',
  'frontend/src/pages/people/volunteers/AssignmentCreate.tsx',
  'frontend/src/pages/people/volunteers/AssignmentEdit.tsx',
  'frontend/src/pages/people/volunteers/VolunteerCreate.tsx',
  'frontend/src/pages/people/volunteers/VolunteerDetail.tsx',
  'frontend/src/pages/people/volunteers/VolunteerEdit.tsx',
  'frontend/src/pages/people/volunteers/VolunteerList.tsx',
  'frontend/src/pages/people/volunteers/VolunteerListEnhanced.tsx',
];

const violations = forbiddenLegacyPageFiles.filter((relPath) =>
  fs.existsSync(path.join(repoRoot, relPath))
);

if (violations.length > 0) {
  console.error(
    'Frontend legacy page path policy violations found. Canonical implementations must stay under frontend/src/features/** pages.'
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Frontend legacy page path policy check passed for scoped migrated domains.');
