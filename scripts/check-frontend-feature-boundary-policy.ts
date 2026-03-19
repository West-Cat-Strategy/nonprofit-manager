#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');
const {
  extractImportSpecifiers,
  resolveImportTarget,
} = require('./lib/import-audit.ts');

const featureFiles = walkFiles(path.join(repoRoot, 'frontend/src/features'), {
  extensions: ['.ts', '.tsx'],
  includeTests: false,
});

const disallowedTargets = [
  path.join(repoRoot, 'frontend/src/pages'),
  path.join(repoRoot, 'frontend/src/store/slices'),
];

const issues = [];

for (const filePath of featureFiles) {
  const text = readText(filePath);
  for (const importEntry of extractImportSpecifiers(text)) {
    const targetPath = resolveImportTarget(filePath, importEntry.specifier, []);
    if (!targetPath) {
      continue;
    }

    if (disallowedTargets.some((targetDir) => targetPath === targetDir || targetPath.startsWith(`${targetDir}${path.sep}`))) {
      issues.push(
        `${relativeToRepo(filePath)}:${importEntry.line} crosses the feature boundary via ${importEntry.specifier}`
      );
    }
  }
}

if (issues.length > 0) {
  console.error('Frontend feature boundary policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Frontend feature boundary policy check passed.');
