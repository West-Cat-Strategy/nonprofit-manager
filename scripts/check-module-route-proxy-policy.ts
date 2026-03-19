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
  extractImportSpecifiers,
  resolveImportTarget,
} = require('./lib/import-audit.ts');

const routeFiles = walkFiles(
  [path.join(repoRoot, 'backend/src/modules'), path.join(repoRoot, 'backend/src/routes')],
  {
    extensions: ['.ts'],
    includeTests: false,
    filter: (filePath) => /\/routes\//.test(filePath),
  }
);

const issues = [];
const disallowedTargets = [
  path.join(repoRoot, 'backend/src/controllers'),
  path.join(repoRoot, 'backend/src/routes'),
];
const allowlistedRoutePrefixes = [
  path.join(repoRoot, 'backend/src/routes/registrars'),
];

for (const filePath of routeFiles) {
  if (filePath === path.join(repoRoot, 'backend/src/modules/plausibleProxy/routes/index.ts')) {
    continue;
  }

  if (allowlistedRoutePrefixes.some((prefix) => filePath === prefix || filePath.startsWith(`${prefix}${path.sep}`))) {
    continue;
  }

  const text = readText(filePath);
  for (const importEntry of extractImportSpecifiers(text)) {
    const targetPath = resolveImportTarget(filePath, importEntry.specifier, backendAliasMap);
    if (!targetPath) {
      continue;
    }

    if (disallowedTargets.some((targetDir) => targetPath === targetDir || targetPath.startsWith(`${targetDir}${path.sep}`))) {
      issues.push(
        `${relativeToRepo(filePath)}:${importEntry.line} proxies through legacy root code via ${importEntry.specifier}`
      );
    }
  }
}

if (issues.length > 0) {
  console.error('Module route proxy policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Module route proxy policy check passed.');
