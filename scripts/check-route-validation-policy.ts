#!/usr/bin/env node

const path = require('path');
const ts = require('typescript');
const {
  readText,
  relativeToRepo,
  repoRoot,
  walkFiles,
} = require('./lib/policy-utils.ts');
const { expressionToRouteValue } = require('./lib/route-audit.ts');

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

const routeMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'all']);
const anyValidatorPattern = /\bvalidate(?:Body|Params|Query|Request)\b|\bzodValidation\b|\bvalidateInput\b/;
const paramsValidatorPattern = /\bvalidate(?:Params|Request)\b|\bzodValidation\b|\bvalidateInput\b/;

function scriptKindForPath(filePath) {
  return filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function getLineNumber(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function expressionContainsValidator(node, pattern) {
  if (!node) {
    return false;
  }

  if (ts.isIdentifier(node)) {
    return pattern.test(node.text);
  }

  if (ts.isPropertyAccessExpression(node)) {
    return pattern.test(node.name.text);
  }

  if (ts.isCallExpression(node)) {
    if (expressionContainsValidator(node.expression, pattern)) {
      return true;
    }

    return node.arguments.some((argument) => expressionContainsValidator(argument, pattern));
  }

  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.some((element) => expressionContainsValidator(element, pattern));
  }

  if (ts.isSpreadElement(node)) {
    return expressionContainsValidator(node.expression, pattern);
  }

  if (ts.isParenthesizedExpression(node)) {
    return expressionContainsValidator(node.expression, pattern);
  }

  return false;
}

function analyzeRouteValidationSource(filePath, text, kind = 'route') {
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(filePath)
  );
  const issues = [];
  let routeDefinitionCount = 0;

  function visit(node) {
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression)) {
      ts.forEachChild(node, visit);
      return;
    }

    const methodName = node.expression.name.text;
    if (!routeMethods.has(methodName)) {
      ts.forEachChild(node, visit);
      return;
    }

    const [firstArgument, ...middlewareArguments] = node.arguments;
    const routePath = expressionToRouteValue(firstArgument);
    if (!routePath || !routePath.startsWith('/')) {
      ts.forEachChild(node, visit);
      return;
    }

    if (kind === 'entrypoint' && !routePath.startsWith('/api')) {
      ts.forEachChild(node, visit);
      return;
    }

    routeDefinitionCount += 1;

    if (!allowlistedFiles.has(filePath) && routePath.includes(':')) {
      const hasParamsValidation = middlewareArguments.some((argument) =>
        expressionContainsValidator(argument, paramsValidatorPattern)
      );

      if (!hasParamsValidation) {
        issues.push(
          `${relativeToRepo(filePath)}:${getLineNumber(sourceFile, node)} defines parameterized route ${routePath} without params validation middleware`
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (kind !== 'entrypoint' && !allowlistedFiles.has(filePath) && routeDefinitionCount > 0) {
    const hasAnyValidation = anyValidatorPattern.test(text);
    if (!hasAnyValidation) {
      const firstRouteCall = text.match(/\.\s*(?:get|post|put|patch|delete|all)\s*\(/);
      const line = firstRouteCall && firstRouteCall.index != null
        ? text.slice(0, firstRouteCall.index).split(/\r?\n/).length
        : 1;
      issues.push(
        `${relativeToRepo(filePath)}:${line} defines routes without any recognized validation middleware`
      );
    }
  }

  return { issues, routeDefinitionCount };
}

function main() {
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

  console.log('Route validation policy check passed (parameterized routes and route files use recognized validation middleware).');
}

if (require.main === module) {
  main();
}

module.exports = {
  analyzeRouteValidationSource,
  main,
};
