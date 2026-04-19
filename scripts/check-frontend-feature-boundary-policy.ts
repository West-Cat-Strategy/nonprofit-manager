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
  sourceRoots: path.join(repoRoot, 'frontend/src/features'),
  disallowedTargets: [legacyPaths.pages, legacyPaths.slices],
  messageForViolation: (importEntry) =>
    `crosses the feature boundary via ${importEntry.specifier}`,
});

if (issues.length > 0) {
  console.error('Frontend feature boundary policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Frontend feature boundary policy check passed.');
