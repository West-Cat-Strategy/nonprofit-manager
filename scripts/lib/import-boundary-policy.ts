#!/usr/bin/env node

const path = require('path');
const {
  relativeToRepo,
  readText,
  repoRoot,
  walkFiles,
} = require('./policy-utils.ts');
const {
  extractImportSpecifiers,
  resolveImportTarget,
} = require('./import-audit.ts');

function isWithinTarget(targetPath, disallowedTarget) {
  return targetPath === disallowedTarget || targetPath.startsWith(`${disallowedTarget}${path.sep}`);
}

function collectImportBoundaryIssues({
  sourceRoots,
  excludedSourceRoots = [],
  disallowedTargets,
  extensions = ['.ts', '.tsx'],
  includeTests = false,
  messageForViolation,
  filter = null,
}) {
  const sourceFiles = walkFiles(sourceRoots, {
    extensions,
    includeTests,
    filter,
  });

  const issues = [];

  for (const filePath of sourceFiles) {
    if (excludedSourceRoots.some((excludedRoot) => isWithinTarget(filePath, excludedRoot))) {
      continue;
    }

    const text = readText(filePath);
    for (const importEntry of extractImportSpecifiers(text)) {
      const targetPath = resolveImportTarget(filePath, importEntry.specifier, []);
      if (!targetPath) {
        continue;
      }

      const matchedTarget = disallowedTargets.find((disallowedTarget) =>
        isWithinTarget(targetPath, disallowedTarget)
      );

      if (!matchedTarget) {
        continue;
      }

      issues.push(
        `${relativeToRepo(filePath)}:${importEntry.line} ${messageForViolation(importEntry, matchedTarget)}`
      );
    }
  }

  return issues;
}

function frontendLegacyPaths() {
  return {
    pages: path.join(repoRoot, 'frontend/src/pages'),
    slices: path.join(repoRoot, 'frontend/src/store/slices'),
  };
}

module.exports = {
  collectImportBoundaryIssues,
  frontendLegacyPaths,
};
