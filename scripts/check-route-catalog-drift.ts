#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { loadRouteCatalogModule, repoRoot } = require('./lib/load-route-catalog');
const { toPosixRelative, walkFiles } = require('./lib/route-integrity-lib');

const routeCatalogModule = loadRouteCatalogModule();
const { routeCatalog, normalizeRouteLocation } = routeCatalogModule;

const routeSearchRoots = [
  path.join(repoRoot, 'frontend', 'src', 'routes'),
  path.join(repoRoot, 'frontend', 'src', 'features'),
];
const routeFiles = Array.from(
  new Set(
    routeSearchRoots.flatMap((root) =>
      walkFiles(
        root,
        (filePath) =>
          (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
          !filePath.includes(`${path.sep}__tests__${path.sep}`) &&
          (root.endsWith(`${path.sep}routes`) || filePath.includes(`${path.sep}routes${path.sep}`))
      )
    )
  )
);

const pathPattern = /\bpath\s*=\s*["']([^"']+)["']/g;
const registeredPaths = [];

const stripSearch = (value) => normalizeRouteLocation(value).split('?')[0] || '/';

const routePatternMatchesPath = (routePattern, targetPath) => {
  const normalizedPattern = stripSearch(routePattern);
  const normalizedTarget = stripSearch(targetPath);

  if (normalizedPattern === normalizedTarget) {
    return true;
  }

  const patternSegments = normalizedPattern.split('/').filter(Boolean);
  const targetSegments = normalizedTarget.split('/').filter(Boolean);

  if (patternSegments.length !== targetSegments.length) {
    return false;
  }

  return patternSegments.every(
    (segment, index) => segment.startsWith(':') || segment === targetSegments[index]
  );
};

for (const file of routeFiles) {
  const source = fs.readFileSync(file, 'utf8');
  let match;
  pathPattern.lastIndex = 0;

  while ((match = pathPattern.exec(source)) !== null) {
    const routePath = match[1];
    if (routePath === '*') {
      continue;
    }

    registeredPaths.push({
      file: toPosixRelative(repoRoot, file),
      path: normalizeRouteLocation(routePath),
    });
  }
}

const catalogIds = new Set();
const duplicateIds = [];

for (const entry of routeCatalog) {
  if (catalogIds.has(entry.id)) {
    duplicateIds.push(entry.id);
    continue;
  }
  catalogIds.add(entry.id);
}

const canonicalCatalogPaths = routeCatalog.map((entry) => normalizeRouteLocation(entry.path));
const aliasCatalogPaths = Array.from(
  new Set(
    routeCatalog.flatMap((entry) =>
      (entry.aliases ?? []).map((alias) =>
        stripSearch(typeof alias === 'string' ? alias : alias.path)
      )
    )
  )
);

const registeredPathSet = new Set(registeredPaths.map((entry) => entry.path));
const missingFromCatalog = registeredPaths.filter((entry) => {
  const catalogBackedPaths = canonicalCatalogPaths.concat(aliasCatalogPaths);
  return !catalogBackedPaths.some((catalogPath) => routePatternMatchesPath(entry.path, catalogPath));
});

const missingCanonicalFromRoutes = canonicalCatalogPaths.filter(
  (catalogPath) => !registeredPaths.some((entry) => routePatternMatchesPath(entry.path, catalogPath))
);
const missingAliasesFromRoutes = aliasCatalogPaths.filter(
  (aliasPath) => !registeredPaths.some((entry) => routePatternMatchesPath(entry.path, aliasPath))
);

if (
  duplicateIds.length > 0 ||
  missingFromCatalog.length > 0 ||
  missingCanonicalFromRoutes.length > 0 ||
  missingAliasesFromRoutes.length > 0
) {
  console.error('Route catalog drift check failed.');

  if (duplicateIds.length > 0) {
    console.error(`- Duplicate catalog ids: ${duplicateIds.join(', ')}`);
  }

  if (missingFromCatalog.length > 0) {
    console.error('- Registered routes missing from route catalog:');
    for (const entry of missingFromCatalog) {
      console.error(`  - ${entry.file}: ${entry.path}`);
    }
  }

  if (missingCanonicalFromRoutes.length > 0) {
    console.error('- Canonical catalog paths missing from registered routes:');
    for (const catalogPath of missingCanonicalFromRoutes) {
      console.error(`  - ${catalogPath}`);
    }
  }

  if (missingAliasesFromRoutes.length > 0) {
    console.error('- Alias catalog paths missing from registered routes:');
    for (const aliasPath of missingAliasesFromRoutes) {
      console.error(`  - ${aliasPath}`);
    }
  }

  process.exit(1);
}

console.log(
  `Route catalog drift check passed. ${catalogIds.size} catalog entries align with ${registeredPathSet.size} registered route path(s), ${canonicalCatalogPaths.length} canonical path(s), and ${aliasCatalogPaths.length} alias path(s).`
);
