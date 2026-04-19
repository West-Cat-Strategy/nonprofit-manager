#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
} = require('./lib/policy-utils.ts');
const {
  collectImportBoundaryIssues,
  frontendLegacyPaths,
} = require('./lib/import-boundary-policy.ts');

const legacyPaths = frontendLegacyPaths();
const issues = collectImportBoundaryIssues({
  sourceRoots: path.join(repoRoot, 'frontend/src'),
  excludedSourceRoots: [legacyPaths.slices],
  disallowedTargets: [legacyPaths.slices],
  messageForViolation: (importEntry) =>
    `imports legacy store slice code via ${importEntry.specifier}`,
});

if (issues.length > 0) {
  console.error('Frontend legacy slice import policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Frontend legacy slice import check complete.');
