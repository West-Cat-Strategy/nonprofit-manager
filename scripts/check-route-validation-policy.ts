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

const entrypointFiles = [
  path.join(repoRoot, 'backend/src/index.ts'),
  path.join(repoRoot, 'backend/src/public-site.ts'),
];

const ROUTE_METHOD_DETECT_REGEX = /\.\s*(?:get|post|put|patch|delete|all)\s*\(/;
const DIRECT_API_ROUTE_REGEX = /\b(?:app|router)\.\s*(?:get|post|put|patch|delete|all)\s*\(\s*(['"`])\/api[^'"`]*\1/g;
const VALIDATOR_REGEX = /\bvalidate(?:Body|Params|Query|Request)\b|\bzodValidation\b|\bvalidateInput\b/g;

const getLineNumber = (text, index) => text.slice(0, index).split(/\r?\n/).length;

const hasValidationMiddleware = (text, index) => {
  const slice = text.slice(index, index + 300);
  return VALIDATOR_REGEX.test(slice);
};

const analyzeRouteValidationSource = (filePath, text, kind = 'route') => {
  const issues = [];
  let routeDefinitionCount = 0;

  if (kind === 'entrypoint') {
    const matches = [...text.matchAll(DIRECT_API_ROUTE_REGEX)];
    routeDefinitionCount = matches.length;

    for (const match of matches) {
      if (!hasValidationMiddleware(text, match.index)) {
        issues.push(
          `${relativeToRepo(filePath)}:${getLineNumber(text, match.index)} defines routes without a validation middleware`
        );
      }
    }

    return { issues, routeDefinitionCount };
  }

  const hasRouteDefinitions = ROUTE_METHOD_DETECT_REGEX.test(text);
  if (!hasRouteDefinitions) {
    return { issues, routeDefinitionCount };
  }

  if (allowlistedFiles.has(filePath)) {
    return { issues, routeDefinitionCount: 1 };
  }

  const validatorMatches = text.match(
    /\bvalidate(?:Body|Params|Query|Request)\b|\bzodValidation\b|\bvalidateInput\b/g
  );
  routeDefinitionCount = 1;

  if (validatorMatches && validatorMatches.length > 0) {
    return { issues, routeDefinitionCount };
  }

  const firstRouteIndex = text.search(ROUTE_METHOD_DETECT_REGEX);
  const line = firstRouteIndex >= 0 ? getLineNumber(text, firstRouteIndex) : 1;
  issues.push(
    `${relativeToRepo(filePath)}:${line} defines routes without a validation middleware`
  );

  return { issues, routeDefinitionCount };
};

const main = () => {
  const files = [
    ...walkFiles(routeRoots, {
      extensions: ['.ts'],
      includeTests: false,
      filter: (filePath) => /\/routes\//.test(filePath),
    }),
    ...walkFiles(entrypointFiles, {
      extensions: ['.ts'],
      includeTests: false,
    }),
  ];

  const issues = [];
  let routeDefinitionCount = 0;

  for (const filePath of files) {
    const text = readText(filePath);
    const kind = entrypointFiles.includes(filePath) ? 'entrypoint' : 'route';
    const result = analyzeRouteValidationSource(filePath, text, kind);
    issues.push(...result.issues);
    routeDefinitionCount += result.routeDefinitionCount;
  }

  if (issues.length > 0) {
    console.error('Route validation policy check failed:\n');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  if (routeDefinitionCount === 0) {
    console.error(
      'Route validation policy check failed:\n- No route definitions were found in backend route roots or app entrypoints'
    );
    process.exit(1);
  }

  console.log('Route validation policy check passed.');
};

if (require.main === module) {
  main();
}

module.exports = {
  analyzeRouteValidationSource,
  main,
};
