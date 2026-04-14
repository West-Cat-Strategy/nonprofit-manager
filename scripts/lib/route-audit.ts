#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  readText,
  walkFiles,
} = require('./policy-utils.ts');

const routeCatalogFiles = [
  path.join(repoRoot, 'frontend/src/routes/routeCatalog/public.ts'),
  path.join(repoRoot, 'frontend/src/routes/routeCatalog/portal.ts'),
  path.join(repoRoot, 'frontend/src/routes/routeCatalog/staff.ts'),
  path.join(repoRoot, 'frontend/src/routes/routeCatalog/demo.ts'),
];

const compatibilityRoutes = new Set([
  '/email-marketing',
  '/settings/admin',
  '/settings/admin/email',
  '/settings/admin/portal',
  '/settings/organization',
  '/admin/audit-logs',
  '/settings/admin/:section',
  '/accept-invitation',
  '/reset-password',
  '/portal/accept-invitation',
]);

const auxiliaryAllowedRoutes = new Set([
  '/',
  '*',
  '/api',
  '/api/health',
  '/health',
  '/health/live',
  '/health/ready',
  '/health/detailed',
]);

function normalizeRouteTarget(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(trimmed)) {
    return null;
  }

  const [withoutHash] = trimmed.split('#');
  const [withoutQuery] = withoutHash.split('?');
  const cleaned = withoutQuery.replace(/\/+$/, '');
  return cleaned || '/';
}

function isRouteTargetCandidate(value) {
  return typeof value === 'string' && value.startsWith('/');
}

function extractRouteTargets(text, filePath, patterns) {
  const targets = [];
  for (const { kind, regex } of patterns) {
    for (const match of text.matchAll(regex)) {
      const rawTarget = match[1];
      const normalized = normalizeRouteTarget(rawTarget);
      if (!normalized || !isRouteTargetCandidate(normalized)) {
        continue;
      }

      targets.push({
        filePath,
        kind,
        index: match.index ?? 0,
        line: text.slice(0, match.index ?? 0).split(/\r?\n/).length,
        target: normalized,
      });
    }
  }

  return targets;
}

function collectTargetsFromFiles(filePaths, patterns) {
  const targets = [];
  for (const filePath of filePaths) {
    const text = readText(filePath);
    targets.push(...extractRouteTargets(text, filePath, patterns));
  }

  return targets;
}

function collectRouteCatalogTargets() {
  const targets = new Set();
  const patterns = [
    { kind: 'path', regex: /\bpath\s*:\s*['"]([^'"]+)['"]/g },
    { kind: 'href', regex: /\bhref\s*:\s*['"]([^'"]+)['"]/g },
  ];

  for (const filePath of routeCatalogFiles) {
    const text = readText(filePath);
    for (const target of extractRouteTargets(text, filePath, patterns)) {
      targets.add(target.target);
    }
  }

  return targets;
}

function collectRouteRegistrationTargets() {
  const routeFiles = walkFiles(path.join(repoRoot, 'frontend/src/routes'), {
    extensions: ['.ts', '.tsx'],
    includeTests: false,
    filter: (filePath) =>
      !filePath.includes(`${path.sep}routeCatalog${path.sep}`) &&
      !filePath.endsWith(`${path.sep}routeCatalog.ts`) &&
      !filePath.endsWith(`${path.sep}startupRouteCatalog.ts`),
  });

  const patterns = [
    { kind: 'route-path', regex: /<Route[^>]*\bpath=\{?\s*['"]([^'"`]+)['"]\s*\}?/g },
    { kind: 'navigate-to', regex: /\bto=\{?\s*['"]([^'"`]+)['"]\s*\}?/g },
    { kind: 'href', regex: /\bhref=\{?\s*['"]([^'"`]+)['"]\s*\}?/g },
    { kind: 'path-prop', regex: /\bpath\s*:\s*['"]([^'"]+)['"]/g },
  ];

  return collectTargetsFromFiles(routeFiles, patterns);
}

function collectRuntimeRouteTargets() {
  const runtimeFiles = walkFiles(path.join(repoRoot, 'frontend/src'), {
    extensions: ['.ts', '.tsx'],
    includeTests: false,
    filter: (filePath) => !filePath.includes(`${path.sep}routeCatalog${path.sep}`),
  });

  const patterns = [
    { kind: 'navigate', regex: /\bnavigate\(\s*['"]([^'"`]+)['"]/g },
    { kind: 'push', regex: /\bpush\(\s*['"]([^'"`]+)['"]/g },
    { kind: 'replace', regex: /\breplace\(\s*['"]([^'"`]+)['"]/g },
    { kind: 'href', regex: /\bhref=\{?\s*['"]([^'"`]+)['"]\s*\}?/g },
    { kind: 'to', regex: /\bto=\{?\s*['"]([^'"`]+)['"]\s*\}?/g },
    { kind: 'path', regex: /\bpath=\{?\s*['"]([^'"`]+)['"]\s*\}?/g },
    { kind: 'pathname-startsWith', regex: /\bpathname\.(?:startsWith|endsWith|includes)\(\s*['"]([^'"`]+)['"]/g },
    { kind: 'pathname-compare', regex: /\bpathname\s*(?:===|==)\s*['"]([^'"`]+)['"]/g },
  ];

  return collectTargetsFromFiles(runtimeFiles, patterns);
}

function collectRouteIntegrityIssues() {
  const catalogTargets = collectRouteCatalogTargets();
  const runtimeTargets = collectRuntimeRouteTargets();
  const issues = [];

  for (const targetEntry of runtimeTargets) {
    if (auxiliaryAllowedRoutes.has(targetEntry.target) || compatibilityRoutes.has(targetEntry.target)) {
      continue;
    }

    if (!catalogTargets.has(targetEntry.target)) {
      issues.push(
        `${path.relative(repoRoot, targetEntry.filePath)}:${targetEntry.line} targets non-catalog route ${targetEntry.target}`
      );
    }
  }

  return {
    issues,
    catalogTargets,
    runtimeTargets,
  };
}

function collectRouteCatalogDriftIssues() {
  const catalogTargets = collectRouteCatalogTargets();
  const registrationTargets = collectRouteRegistrationTargets();
  const issues = [];

  for (const targetEntry of registrationTargets) {
    if (auxiliaryAllowedRoutes.has(targetEntry.target) || compatibilityRoutes.has(targetEntry.target)) {
      continue;
    }

    if (!catalogTargets.has(targetEntry.target)) {
      issues.push(
        `${path.relative(repoRoot, targetEntry.filePath)}:${targetEntry.line} registers non-catalog route ${targetEntry.target}`
      );
    }
  }

  return {
    issues,
    catalogTargets,
    registrationTargets,
  };
}

module.exports = {
  auxiliaryAllowedRoutes,
  collectRouteCatalogDriftIssues,
  collectRouteCatalogTargets,
  collectRouteIntegrityIssues,
  collectRouteRegistrationTargets,
  collectRuntimeRouteTargets,
  compatibilityRoutes,
  extractRouteTargets,
  isRouteTargetCandidate,
  normalizeRouteTarget,
};
