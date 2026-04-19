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
  excludedSourceRoots: [legacyPaths.pages, legacyPaths.slices],
  disallowedTargets: [legacyPaths.pages, legacyPaths.slices],
  filter: (filePath) => !filePath.includes(`${path.sep}node_modules${path.sep}`),
  messageForViolation: (importEntry) =>
    `imports legacy compatibility code via ${importEntry.specifier}`,
});

if (issues.length > 0) {
  console.error('Canonical module import policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Canonical module import policy check passed.');
