#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  repoRoot,
  readText,
  walkFiles,
} = require('./policy-utils.ts');

const backendAliasMap = [
  ['@container/', path.join(repoRoot, 'backend/src/container')],
  ['@modules/', path.join(repoRoot, 'backend/src/modules')],
  ['@services/', path.join(repoRoot, 'backend/src/services')],
  ['@services', path.join(repoRoot, 'backend/src/services')],
  ['@config/', path.join(repoRoot, 'backend/src/config')],
  ['@utils/', path.join(repoRoot, 'backend/src/utils')],
  ['@app-types/', path.join(repoRoot, 'backend/src/types')],
  ['@validations/', path.join(repoRoot, 'backend/src/validations')],
  ['@validations', path.join(repoRoot, 'backend/src/validations')],
  ['@middleware/', path.join(repoRoot, 'backend/src/middleware')],
  ['@middleware', path.join(repoRoot, 'backend/src/middleware')],
  ['@controllers/', path.join(repoRoot, 'backend/src/controllers')],
  ['@routes/', path.join(repoRoot, 'backend/src/routes')],
  ['@ingest/', path.join(repoRoot, 'backend/src/ingest')],
];

const importPatterns = [
  { kind: 'import-from', regex: /\bimport\s+[^'";]*?\s+from\s+['"]([^'"]+)['"]/g },
  { kind: 'export-from', regex: /\bexport\s+[^'";]*?\s+from\s+['"]([^'"]+)['"]/g },
  { kind: 'import-only', regex: /\bimport\s+['"]([^'"]+)['"]/g },
  { kind: 'require', regex: /\brequire\(\s*['"]([^'"]+)['"]\s*\)/g },
];

function getLineNumber(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function extractImportSpecifiers(text) {
  const results = [];
  for (const { kind, regex } of importPatterns) {
    for (const match of text.matchAll(regex)) {
      const specifier = match[1];
      if (!specifier) {
        continue;
      }

      results.push({
        kind,
        specifier,
        index: match.index ?? 0,
        line: getLineNumber(text, match.index ?? 0),
      });
    }
  }

  return results;
}

function resolveCandidatePaths(basePath) {
  return [
    basePath,
    `${basePath}.ts`,
    `${basePath}.tsx`,
    `${basePath}.js`,
    `${basePath}.jsx`,
    path.join(basePath, 'index.ts'),
    path.join(basePath, 'index.tsx'),
    path.join(basePath, 'index.js'),
    path.join(basePath, 'index.jsx'),
  ];
}

function resolveRelativeImport(filePath, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const basePath = path.resolve(path.dirname(filePath), specifier);
  for (const candidate of resolveCandidatePaths(basePath)) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return basePath;
}

function resolveAliasedImport(specifier, aliasMap = backendAliasMap) {
  const sortedAliases = [...aliasMap].sort((left, right) => right[0].length - left[0].length);
  for (const [aliasPrefix, targetPath] of sortedAliases) {
    if (specifier !== aliasPrefix && !specifier.startsWith(aliasPrefix)) {
      continue;
    }

    const suffix = specifier === aliasPrefix ? '' : specifier.slice(aliasPrefix.length);
    const basePath = path.resolve(targetPath, suffix.replace(/^\//, ''));
    for (const candidate of resolveCandidatePaths(basePath)) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return basePath;
  }

  return null;
}

function resolveImportTarget(filePath, specifier, aliasMap = backendAliasMap) {
  return resolveRelativeImport(filePath, specifier) || resolveAliasedImport(specifier, aliasMap);
}

function isWithinPath(childPath, parentPath) {
  const relative = path.relative(parentPath, childPath);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function collectImportSpecifiersFromFiles(rootDirs, options = {}) {
  const files = walkFiles(rootDirs, {
    extensions: options.extensions || ['.ts', '.tsx', '.js', '.jsx'],
    includeTests: options.includeTests ?? false,
    filter: options.filter || null,
  });

  const imports = [];
  for (const filePath of files) {
    const text = readText(filePath);
    for (const entry of extractImportSpecifiers(text)) {
      imports.push({
        ...entry,
        filePath,
      });
    }
  }

  return imports;
}

module.exports = {
  backendAliasMap,
  collectImportSpecifiersFromFiles,
  extractImportSpecifiers,
  getLineNumber,
  isWithinPath,
  resolveAliasedImport,
  resolveImportTarget,
  resolveRelativeImport,
};
