#!/usr/bin/env node

const { loadRouteCatalogModule, repoRoot } = require('./lib/load-route-catalog');
const { collectRouteIntegrityViolations } = require('./lib/route-integrity-lib');

const routeCatalogModule = loadRouteCatalogModule();
const { references, violations } = collectRouteIntegrityViolations(repoRoot, routeCatalogModule);

if (violations.length > 0) {
  console.error(
    'Route integrity check failed. Literal route targets must resolve through frontend/src/routes/routeCatalog.ts.'
  );
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} [${violation.kind}] -> ${violation.target}`);
  }
  process.exit(1);
}

console.log(
  `Route integrity check passed. Validated ${references.length} literal route target(s) against the canonical catalog.`
);
