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
});

const legacyDir = path.join(repoRoot, 'frontend/src/store/slices');
const issues = [];

for (const filePath of sourceFiles) {
  if (filePath.startsWith(legacyDir)) {
    continue;
  }

  const text = readText(filePath);
  for (const importEntry of extractImportSpecifiers(text)) {
    const targetPath = resolveImportTarget(filePath, importEntry.specifier, []);
    if (!targetPath) {
      continue;
    }

    if (targetPath === legacyDir || targetPath.startsWith(`${legacyDir}${path.sep}`)) {
      issues.push(
        `${relativeToRepo(filePath)}:${importEntry.line} imports legacy store slice code via ${importEntry.specifier}`
      );
    }
  }
}

if (issues.length > 0) {
  console.error('Frontend legacy slice import policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Frontend legacy slice import check complete.');
