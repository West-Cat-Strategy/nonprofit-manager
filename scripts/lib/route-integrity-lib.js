const fs = require('node:fs');
const path = require('node:path');

const FRONTEND_ROOT = path.join('frontend', 'src');
const EXCLUDED_SEGMENTS = [
  `${path.sep}__tests__${path.sep}`,
  '.test.ts',
  '.test.tsx',
  '.spec.ts',
  '.spec.tsx',
];
const EXCLUDED_FILES = new Set(['frontend/src/routes/routeCatalog.ts']);

const TARGET_PATTERNS = [
  { kind: 'jsx-prop', regex: /\b(?:to|href)=["'](\/[^"'#{][^"']*)["']/g },
  { kind: 'object-prop', regex: /\b(?:to|href)\s*:\s*["'](\/[^"'#][^"']*)["']/g },
  { kind: 'navigate-call', regex: /\bnavigate\(\s*["'](\/[^"'#][^"']*)["']/g },
  { kind: 'navigate-element', regex: /<Navigate[^>]+\bto=["'](\/[^"'#][^"']*)["']/g },
];

function walkFiles(rootDir, predicate, acc = []) {
  if (!fs.existsSync(rootDir)) {
    return acc;
  }

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, acc);
      continue;
    }

    if (entry.isFile() && predicate(fullPath)) {
      acc.push(fullPath);
    }
  }

  return acc;
}

function toPosixRelative(repoRoot, filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function isFrontendSourceFile(filePath) {
  if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
    return false;
  }

  return !EXCLUDED_SEGMENTS.some((segment) => filePath.includes(segment));
}

function lineNumberFromIndex(source, index) {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source.charCodeAt(cursor) === 10) {
      line += 1;
    }
  }
  return line;
}

function collectRouteReferences(repoRoot) {
  const sourceRoot = path.join(repoRoot, FRONTEND_ROOT);
  const files = walkFiles(sourceRoot, isFrontendSourceFile);
  const references = [];

  for (const file of files) {
    const relPath = toPosixRelative(repoRoot, file);
    if (EXCLUDED_FILES.has(relPath)) {
      continue;
    }

    const source = fs.readFileSync(file, 'utf8');

    for (const { kind, regex } of TARGET_PATTERNS) {
      regex.lastIndex = 0;
      let match;

      while ((match = regex.exec(source)) !== null) {
        const target = match[1];
        if (!target || target.startsWith('/api/') || target.startsWith('/v2/')) {
          continue;
        }

        references.push({
          file: relPath,
          line: lineNumberFromIndex(source, match.index),
          kind,
          target,
        });
      }
    }
  }

  return references;
}

function collectRouteIntegrityViolations(repoRoot, routeCatalogModule) {
  const references = collectRouteReferences(repoRoot);
  const { matchRouteCatalogEntry, normalizeRouteLocation } = routeCatalogModule;
  const violations = references.filter((reference) => {
    const normalizedTarget = normalizeRouteLocation(reference.target);
    return matchRouteCatalogEntry(normalizedTarget) === null;
  });

  return { references, violations };
}

module.exports = {
  collectRouteIntegrityViolations,
  collectRouteReferences,
  toPosixRelative,
  walkFiles,
};
