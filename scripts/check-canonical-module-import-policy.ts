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

const sourceFiles = walkFiles(path.join(repoRoot, 'frontend/src'), {
  extensions: ['.ts', '.tsx'],
  includeTests: false,
  filter: (filePath) => !filePath.includes(`${path.sep}node_modules${path.sep}`),
});

const disallowedTargets = [
  path.join(repoRoot, 'frontend/src/pages'),
  path.join(repoRoot, 'frontend/src/store/slices'),
];

const issues = [];

for (const filePath of sourceFiles) {
  if (
    filePath.startsWith(path.join(repoRoot, 'frontend/src/pages')) ||
    filePath.startsWith(path.join(repoRoot, 'frontend/src/store/slices'))
  ) {
    continue;
  }

  const text = readText(filePath);
  for (const importEntry of extractImportSpecifiers(text)) {
    const targetPath = resolveImportTarget(filePath, importEntry.specifier, []);
    if (!targetPath) {
      continue;
    }

    if (disallowedTargets.some((targetDir) => targetPath === targetDir || targetPath.startsWith(`${targetDir}${path.sep}`))) {
      issues.push(
        `${relativeToRepo(filePath)}:${importEntry.line} imports legacy compatibility code via ${importEntry.specifier}`
      );
    }
  }
}

if (issues.length > 0) {
  console.error('Canonical module import policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Canonical module import policy check passed.');
