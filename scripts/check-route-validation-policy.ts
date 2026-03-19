#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');

const allowlistedFiles = new Set([
  path.join(repoRoot, 'backend/src/routes/health.ts'),
  path.join(repoRoot, 'backend/src/modules/plausibleProxy/routes/index.ts'),
]);

const routeRoots = [
  path.join(repoRoot, 'backend/src/routes'),
  path.join(repoRoot, 'backend/src/modules'),
];
const routeFiles = walkFiles(routeRoots, {
  extensions: ['.ts'],
  includeTests: false,
  filter: (filePath) => /\/routes\//.test(filePath),
});

const issues = [];

for (const filePath of routeFiles) {
  const text = readText(filePath);
  const hasRouteDefinitions = /\.\s*(?:get|post|put|patch|delete|all)\s*\(/.test(text);
  if (!hasRouteDefinitions) {
    continue;
  }

  if (allowlistedFiles.has(filePath)) {
    continue;
  }

  const validatorMatches = text.match(
    /\bvalidate(?:Body|Params|Query|Request)\b|\bzodValidation\b|\bvalidateInput\b/g
  );
  if (validatorMatches && validatorMatches.length > 0) {
    continue;
  }

  const line = text.split(/\r?\n/).findIndex((lineText) => /\.\s*(?:get|post|put|patch|delete|all)\s*\(/.test(lineText)) + 1;
  issues.push(`${relativeToRepo(filePath)}:${line} defines routes without a validation middleware`);
}

if (issues.length > 0) {
  console.error('Route validation policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Route validation policy check passed.');
