#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const {
  readText,
  repoRoot,
  walkFiles,
} = require('./policy-utils.ts');
const {
  extractImportSpecifiers,
  resolveImportTarget,
} = require('./import-audit.ts');

const routeCatalogDirectory = path.join(repoRoot, 'frontend/src/routes/routeCatalog');
const routeCatalogAdditionalSourceFiles = [
  path.join(repoRoot, 'frontend/src/routes/peopleRouteDescriptors.tsx'),
];
const routeCatalogExternalRoots = [
  path.join(repoRoot, 'frontend/src/routes'),
  path.join(repoRoot, 'frontend/src/features/adminOps'),
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

function canonicalizeRoutePattern(value) {
  const normalized = normalizeRouteTarget(value);
  if (!normalized) {
    return null;
  }

  return normalized
    .replace(/\$\{[^}]+\}/g, ':dynamic')
    .replace(/:[^/]+/g, ':*');
}

function isRouteTargetCandidate(value) {
  return typeof value === 'string' && value.startsWith('/');
}

function scriptKindForPath(filePath) {
  return filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
}

function getLineNumber(sourceFile, node) {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function isPropertyNamed(node, expectedName) {
  return ts.isIdentifier(node)
    ? node.text === expectedName
    : ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
      ? node.text === expectedName
      : false;
}

function isPathnameExpression(node) {
  if (!node) {
    return false;
  }

  if (ts.isIdentifier(node)) {
    return node.text === 'pathname';
  }

  if (ts.isPropertyAccessExpression(node)) {
    return node.name.text === 'pathname';
  }

  return false;
}

function expressionToRouteValue(node) {
  if (!node) {
    return null;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  if (ts.isTemplateExpression(node)) {
    let value = node.head.text;
    for (const span of node.templateSpans) {
      value += ':dynamic';
      value += span.literal.text;
    }
    return value;
  }

  if (ts.isParenthesizedExpression(node)) {
    return expressionToRouteValue(node.expression);
  }

  if (ts.isObjectLiteralExpression(node)) {
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || !isPropertyNamed(property.name, 'pathname')) {
        continue;
      }

      return expressionToRouteValue(property.initializer);
    }
  }

  return null;
}

function attributeInitializerToRouteValue(initializer) {
  if (!initializer) {
    return null;
  }

  if (ts.isStringLiteral(initializer)) {
    return initializer.text;
  }

  if (ts.isJsxExpression(initializer)) {
    return expressionToRouteValue(initializer.expression);
  }

  return null;
}

function createTargetEntry({ filePath, kind, sourceFile, node, value }) {
  const target = normalizeRouteTarget(value);
  const pattern = canonicalizeRoutePattern(value);

  if (!target || !pattern || !isRouteTargetCandidate(target)) {
    return null;
  }

  return {
    filePath,
    kind,
    line: getLineNumber(sourceFile, node),
    target,
    pattern,
  };
}

function collectRouteCatalogTargetsFromSource(filePath, text) {
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(filePath)
  );
  const targets = [];

  function visit(node) {
    if (ts.isPropertyAssignment(node) && (isPropertyNamed(node.name, 'path') || isPropertyNamed(node.name, 'href'))) {
      const value = expressionToRouteValue(node.initializer);
      const targetEntry = createTargetEntry({
        filePath,
        kind: ts.isIdentifier(node.name) ? node.name.text : String(node.name.text),
        sourceFile,
        node,
        value,
      });

      if (targetEntry) {
        targets.push(targetEntry);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return targets;
}

function collectRuntimeRouteTargetsFromSource(filePath, text) {
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(filePath)
  );
  const targets = [];

  function pushExpressionTarget(kind, node, expression) {
    const value = expressionToRouteValue(expression);
    const targetEntry = createTargetEntry({ filePath, kind, sourceFile, node, value });
    if (targetEntry) {
      targets.push(targetEntry);
    }
  }

  function visit(node) {
    if (ts.isCallExpression(node)) {
      const [firstArgument] = node.arguments;

      if (ts.isIdentifier(node.expression) && node.expression.text === 'navigate' && firstArgument) {
        pushExpressionTarget('navigate', node, firstArgument);
      }

      if (ts.isPropertyAccessExpression(node.expression)) {
        const methodName = node.expression.name.text;

        if (['navigate', 'push', 'replace'].includes(methodName) && firstArgument) {
          pushExpressionTarget(methodName, node, firstArgument);
        }

        if (['startsWith', 'endsWith', 'includes'].includes(methodName) && isPathnameExpression(node.expression.expression) && firstArgument) {
          pushExpressionTarget(`pathname-${methodName}`, node, firstArgument);
        }
      }
    }

    if (ts.isBinaryExpression(node) && ['===', '==', '!==', '!='].includes(node.operatorToken.getText(sourceFile))) {
      if (isPathnameExpression(node.left)) {
        pushExpressionTarget('pathname-compare', node, node.right);
      } else if (isPathnameExpression(node.right)) {
        pushExpressionTarget('pathname-compare', node, node.left);
      }
    }

    if (ts.isJsxAttribute(node) && ['to', 'href', 'path'].includes(node.name.text)) {
      const value = attributeInitializerToRouteValue(node.initializer);
      const targetEntry = createTargetEntry({
        filePath,
        kind: node.name.text,
        sourceFile,
        node,
        value,
      });

      if (targetEntry) {
        targets.push(targetEntry);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return targets;
}

function collectRouteRegistrationTargetsFromSource(filePath, text) {
  const sourceFile = ts.createSourceFile(
    filePath,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKindForPath(filePath)
  );
  const targets = [];

  function pushTarget(kind, node, value) {
    const targetEntry = createTargetEntry({
      filePath,
      kind,
      sourceFile,
      node,
      value,
    });

    if (targetEntry) {
      targets.push(targetEntry);
    }
  }

  function visit(node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && ts.isIdentifier(node.tagName)
      && node.tagName.text === 'Route'
    ) {
      for (const attribute of node.attributes.properties) {
        if (!ts.isJsxAttribute(attribute) || attribute.name.text !== 'path') {
          continue;
        }

        pushTarget('route-path', attribute, attributeInitializerToRouteValue(attribute.initializer));
      }
    }

    if (ts.isPropertyAssignment(node) && isPropertyNamed(node.name, 'path')) {
      pushTarget('path-prop', node, expressionToRouteValue(node.initializer));
    }

    if (ts.isJsxAttribute(node) && ['to', 'href'].includes(node.name.text)) {
      pushTarget(node.name.text, node, attributeInitializerToRouteValue(node.initializer));
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return targets;
}

function collectTargetsFromFiles(filePaths, collector) {
  const targets = [];

  for (const filePath of filePaths) {
    const text = readText(filePath);
    targets.push(...collector(filePath, text));
  }

  return targets;
}

function isWithinRouteCatalogInputRoots(filePath) {
  return [
    routeCatalogDirectory,
    ...routeCatalogExternalRoots,
  ].some((root) => filePath === root || filePath.startsWith(`${root}${path.sep}`));
}

function collectRouteCatalogSourceFiles() {
  const entryFiles = walkFiles(routeCatalogDirectory, {
    extensions: ['.ts', '.tsx'],
    includeTests: false,
  });
  const extraCatalogFiles = routeCatalogAdditionalSourceFiles.filter((filePath) =>
    fs.existsSync(filePath)
  );
  const visited = new Set();
  const queue = [...entryFiles, ...extraCatalogFiles];

  while (queue.length > 0) {
    const filePath = queue.shift();
    if (!filePath || visited.has(filePath)) {
      continue;
    }

    visited.add(filePath);

    const text = readText(filePath);
    for (const importEntry of extractImportSpecifiers(text)) {
      const targetPath = resolveImportTarget(filePath, importEntry.specifier, []);
      if (!targetPath || visited.has(targetPath) || !isWithinRouteCatalogInputRoots(targetPath)) {
        continue;
      }

      if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
        continue;
      }

      queue.push(targetPath);
    }
  }

  return [...visited].sort();
}

function collectRouteCatalogTargets() {
  const targetPatterns = new Set();

  for (const entry of collectTargetsFromFiles(collectRouteCatalogSourceFiles(), collectRouteCatalogTargetsFromSource)) {
    targetPatterns.add(entry.pattern);
  }

  return targetPatterns;
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

  return collectTargetsFromFiles(routeFiles, collectRouteRegistrationTargetsFromSource);
}

function collectRuntimeRouteTargets() {
  const runtimeFiles = walkFiles(path.join(repoRoot, 'frontend/src'), {
    extensions: ['.ts', '.tsx'],
    includeTests: false,
    filter: (filePath) => !filePath.includes(`${path.sep}routeCatalog${path.sep}`),
  });

  return collectTargetsFromFiles(runtimeFiles, collectRuntimeRouteTargetsFromSource);
}

function isAllowedRoutePattern(pattern) {
  return [...compatibilityRoutes, ...auxiliaryAllowedRoutes].some(
    (route) => canonicalizeRoutePattern(route) === pattern
  );
}

function splitRoutePattern(pattern) {
  return pattern.split('/').filter(Boolean);
}

function isCompatibleDynamicPattern(runtimePattern, catalogPattern) {
  const runtimeSegments = splitRoutePattern(runtimePattern);
  const catalogSegments = splitRoutePattern(catalogPattern);

  if (runtimeSegments.length !== catalogSegments.length) {
    return false;
  }

  for (let index = 0; index < runtimeSegments.length; index += 1) {
    const runtimeSegment = runtimeSegments[index];
    const catalogSegment = catalogSegments[index];

    if (runtimeSegment === catalogSegment || runtimeSegment === ':*') {
      continue;
    }

    return false;
  }

  return true;
}

function catalogPatternMatchesRuntime(runtimePattern, catalogPattern, kind) {
  if (catalogPattern === runtimePattern) {
    return true;
  }

  if (kind === 'pathname-startsWith') {
    return catalogPattern.startsWith(`${runtimePattern}/`);
  }

  return isCompatibleDynamicPattern(runtimePattern, catalogPattern);
}

function routePatternExists(targetEntry, catalogTargets) {
  for (const catalogPattern of catalogTargets) {
    if (catalogPatternMatchesRuntime(targetEntry.pattern, catalogPattern, targetEntry.kind)) {
      return true;
    }
  }

  return false;
}

function collectRouteIntegrityIssues() {
  const catalogTargets = collectRouteCatalogTargets();
  const runtimeTargets = collectRuntimeRouteTargets();
  const issues = [];

  for (const targetEntry of runtimeTargets) {
    if (isAllowedRoutePattern(targetEntry.pattern)) {
      continue;
    }

    if (!routePatternExists(targetEntry, catalogTargets)) {
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
    if (isAllowedRoutePattern(targetEntry.pattern)) {
      continue;
    }

    if (!catalogTargets.has(targetEntry.pattern)) {
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
  canonicalizeRoutePattern,
  collectRouteCatalogDriftIssues,
  collectRouteCatalogSourceFiles,
  collectRouteCatalogTargets,
  collectRouteCatalogTargetsFromSource,
  collectRouteIntegrityIssues,
  collectRouteRegistrationTargets,
  collectRouteRegistrationTargetsFromSource,
  collectRuntimeRouteTargets,
  collectRuntimeRouteTargetsFromSource,
  compatibilityRoutes,
  catalogPatternMatchesRuntime,
  expressionToRouteValue,
  isRouteTargetCandidate,
  isCompatibleDynamicPattern,
  normalizeRouteTarget,
  routePatternExists,
};
