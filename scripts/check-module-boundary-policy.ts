#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');
const {
  backendAliasMap,
  resolveImportTarget,
  extractImportSpecifiers,
} = require('./lib/import-audit.ts');

const sourceFiles = walkFiles(path.join(repoRoot, 'backend/src/modules'), {
  extensions: ['.ts'],
  includeTests: false,
});

const disallowedTargets = [
  path.join(repoRoot, 'backend/src/controllers'),
  path.join(repoRoot, 'backend/src/routes'),
];

const issues = [];

for (const filePath of sourceFiles) {
  const text = readText(filePath);
  for (const importEntry of extractImportSpecifiers(text)) {
    const targetPath = resolveImportTarget(filePath, importEntry.specifier, backendAliasMap);
    if (!targetPath) {
      continue;
    }

    if (disallowedTargets.some((targetDir) => targetPath === targetDir || targetPath.startsWith(`${targetDir}${path.sep}`))) {
      issues.push(
        `${relativeToRepo(filePath)}:${importEntry.line} imports legacy root code via ${importEntry.specifier}`
      );
    }
  }
}

if (issues.length > 0) {
  console.error('Module boundary policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Module boundary policy check passed.');
