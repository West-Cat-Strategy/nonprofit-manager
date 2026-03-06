#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { loadRouteCatalogModule, repoRoot } = require('./lib/load-route-catalog');
const { toPosixRelative, walkFiles } = require('./lib/route-integrity-lib');

const routeCatalogModule = loadRouteCatalogModule();
const { routeCatalog, normalizeRouteLocation } = routeCatalogModule;

const routesRoot = path.join(repoRoot, 'frontend', 'src', 'routes');
const routeFiles = walkFiles(
  routesRoot,
  (filePath) =>
    (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) &&
    !filePath.includes(`${path.sep}__tests__${path.sep}`)
);

const pathPattern = /\bpath\s*=\s*["']([^"']+)["']/g;
const registeredPaths = [];

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

const catalogPaths = new Set(routeCatalog.map((entry) => normalizeRouteLocation(entry.path)));
const missingFromCatalog = registeredPaths.filter((entry) => !catalogPaths.has(entry.path));

const registeredPathSet = new Set(registeredPaths.map((entry) => entry.path));
const missingFromRoutes = Array.from(catalogPaths).filter((catalogPath) => !registeredPathSet.has(catalogPath));

if (duplicateIds.length > 0 || missingFromCatalog.length > 0 || missingFromRoutes.length > 0) {
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

  if (missingFromRoutes.length > 0) {
    console.error('- Catalog paths missing from registered routes:');
    for (const catalogPath of missingFromRoutes) {
      console.error(`  - ${catalogPath}`);
    }
  }

  process.exit(1);
}

console.log(
  `Route catalog drift check passed. ${catalogIds.size} catalog entries align with ${registeredPathSet.size} registered route path(s).`
);
