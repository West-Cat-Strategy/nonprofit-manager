#!/usr/bin/env node

const path = require('path');
const {
  defaultSkipDirs,
  repoRoot,
  walkFiles,
} = require('./policy-utils.ts');

const docsAuditRoots = [
  'README.md',
  'CONTRIBUTING.md',
  'AGENTS.md',
  'agents.md',
  'backend/README.md',
  'frontend/README.md',
  'frontend/SETUP.md',
  'e2e/README.md',
  'database/README.md',
  'docs',
];

const docsAuditExtensions = ['.md', '.markdown', '.html', '.htm'];
const docsAuditExcludedPrefixes = [
  path.join('docs', 'phases', 'archive'),
];

const docsApiV1AllowedFiles = new Set([
  'docs/deployment/LOG_AGGREGATION_SETUP.md',
  'docs/deployment/PLAUSIBLE_SETUP.md',
  'docs/product/archive/PRODUCT_ANALYTICS_RESEARCH.md',
]);

function normalizeRelativePath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function isWithinExcludedPrefix(relativePath) {
  return docsAuditExcludedPrefixes.some((prefix) => {
    const normalizedPrefix = prefix.split(path.sep).join('/');
    return relativePath === normalizedPrefix || relativePath.startsWith(`${normalizedPrefix}/`);
  });
}

function collectDocsAuditFiles() {
  const files = new Set();

  for (const root of docsAuditRoots) {
    const absoluteRoot = path.join(repoRoot, root);
    for (const filePath of walkFiles(absoluteRoot, {
      extensions: docsAuditExtensions,
      skipDirs: defaultSkipDirs,
      includeTests: true,
      filter: (candidatePath) => !isWithinExcludedPrefix(normalizeRelativePath(candidatePath)),
    })) {
      files.add(filePath);
    }
  }

  return [...files].sort();
}

module.exports = {
  collectDocsAuditFiles,
  docsApiV1AllowedFiles,
  docsAuditExcludedPrefixes,
  docsAuditExtensions,
  docsAuditRoots,
  normalizeRelativePath,
};
