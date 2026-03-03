const fs = require('node:fs');
const path = require('node:path');

const ROUTE_CALL_REGEX = /router\.(get|post|put|patch|delete)\s*\(([^;]*?)\);/gs;

const normalizePath = (value) => value.split(path.sep).join('/');

const skipWhitespace = (source, index) => {
  let cursor = index;
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }
  return cursor;
};

const isArrowFunctionAssignment = (source, assignmentStart) => {
  let cursor = skipWhitespace(source, assignmentStart);
  if (source.slice(cursor, cursor + 5) === 'async') {
    cursor = skipWhitespace(source, cursor + 5);
  }

  if (source[cursor] !== '(') {
    return false;
  }

  let depth = 0;
  for (; cursor < source.length; cursor += 1) {
    const ch = source[cursor];
    if (ch === '(') depth += 1;
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        cursor += 1;
        break;
      }
    }
  }

  if (depth !== 0) {
    return false;
  }

  cursor = skipWhitespace(source, cursor);
  if (source[cursor] === ':') {
    while (cursor < source.length - 1) {
      if (source[cursor] === '=' && source[cursor + 1] === '>') {
        break;
      }
      cursor += 1;
    }
  }

  cursor = skipWhitespace(source, cursor);
  return source[cursor] === '=' && source[cursor + 1] === '>';
};

const walkTypeScriptFiles = (dir) => {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTypeScriptFiles(fullPath));
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
    files.push(fullPath);
  }
  return files;
};

const extractQuerySchemaStrictness = (source) => {
  const strictness = {};
  const schemaDefRegex = /(const|export const)\s+([A-Za-z0-9_]*QuerySchema)\s*=\s*/g;
  let match;
  while ((match = schemaDefRegex.exec(source)) !== null) {
    const schemaName = match[2];
    const start = match.index;
    const end = source.indexOf(';\n', start) === -1 ? source.length : source.indexOf(';\n', start) + 1;
    const segment = source.slice(start, end);
    const isQueryObjectSchema = /z\.object\s*\(/.test(segment);
    const isStrict = /\.strict\s*\(\s*\)/.test(segment);
    if (isQueryObjectSchema) {
      strictness[schemaName] = isStrict;
    }
  }
  return strictness;
};

const extractHandlerToken = (routeCall) => {
  const trimmed = routeCall.trim();
  const commaIndex = trimmed.lastIndexOf(',');
  if (commaIndex === -1) return null;
  const tail = trimmed.slice(commaIndex + 1).replace(/\)\s*$/, '').trim();
  const tokenMatch = tail.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)$/);
  return tokenMatch ? tokenMatch[1] : null;
};

const collectControllerFunctions = (repoRoot) => {
  const controllerRoots = [
    path.join(repoRoot, 'backend/src/controllers'),
    path.join(repoRoot, 'backend/src/modules'),
  ];
  const result = {};

  for (const root of controllerRoots) {
    for (const fullPath of walkTypeScriptFiles(root)) {
      const relPath = normalizePath(path.relative(repoRoot, fullPath));
      const inModuleController =
        relPath.startsWith('backend/src/modules/') && relPath.includes('/controllers/');
      const inLegacyController = relPath.startsWith('backend/src/controllers/');
      if (!inModuleController && !inLegacyController) continue;

      const source = fs.readFileSync(fullPath, 'utf8');
      const constDeclarationRegex = /(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/g;
      const declarations = [];
      let match;
      while ((match = constDeclarationRegex.exec(source)) !== null) {
        const assignmentStart = match.index + match[0].length;
        if (!isArrowFunctionAssignment(source, assignmentStart)) {
          continue;
        }
        declarations.push({ name: match[1], index: match.index });
      }
      declarations.sort((a, b) => a.index - b.index);

      for (let i = 0; i < declarations.length; i += 1) {
        const current = declarations[i];
        const next = declarations[i + 1];
        const segment = source.slice(current.index, next ? next.index : source.length);
        const usesReqQuery = /\breq\.query\b/.test(segment);
        const usesValidatedQuery = /\bvalidatedQuery\b/.test(segment);
        if (!result[current.name]) result[current.name] = [];
        result[current.name].push({
          file: relPath,
          usesReqQuery,
          usesValidatedQuery,
        });
      }
    }
  }
  return result;
};

const buildAudit = (repoRoot) => {
  const routeRoots = [
    path.join(repoRoot, 'backend/src/routes'),
    path.join(repoRoot, 'backend/src/modules'),
  ];
  const routeFiles = [];
  for (const root of routeRoots) {
    for (const fullPath of walkTypeScriptFiles(root)) {
      const relPath = normalizePath(path.relative(repoRoot, fullPath));
      const inLegacyRoutes = relPath.startsWith('backend/src/routes/');
      const inModuleRoutes = relPath.startsWith('backend/src/modules/') && relPath.includes('/routes/');
      if (inLegacyRoutes || inModuleRoutes) routeFiles.push(fullPath);
    }
  }

  const controllerFunctions = collectControllerFunctions(repoRoot);

  const endpoints = [];
  for (const fullPath of routeFiles) {
    const relPath = normalizePath(path.relative(repoRoot, fullPath));
    const source = fs.readFileSync(fullPath, 'utf8');
    const schemaStrictness = extractQuerySchemaStrictness(source);
    let match;
    while ((match = ROUTE_CALL_REGEX.exec(source)) !== null) {
      const method = match[1].toUpperCase();
      const routeCall = match[2];
      const pathMatch = routeCall.match(/["'`]([^"'`]+)["'`]/);
      if (!pathMatch) continue;
      const routePath = pathMatch[1];
      const validateQueryMatch = routeCall.match(/validateQuery\s*\(\s*([A-Za-z_$][\w$]*)\s*\)/);
      const handlerToken = extractHandlerToken(routeCall);
      const handlerName = handlerToken ? handlerToken.split('.').pop() : null;
      const controllerCandidates = handlerName ? controllerFunctions[handlerName] || [] : [];
      const likelyQueryConsumer = controllerCandidates.some((candidate) => candidate.usesReqQuery);
      const controllerUsesReqQuery = controllerCandidates.some((candidate) => candidate.usesReqQuery);
      const controllerUsesValidatedQuery = controllerCandidates.some(
        (candidate) => candidate.usesValidatedQuery
      );

      endpoints.push({
        file: relPath,
        method,
        routePath,
        handler: handlerToken,
        hasValidateQuery: Boolean(validateQueryMatch),
        querySchema: validateQueryMatch ? validateQueryMatch[1] : null,
        querySchemaStrict:
          validateQueryMatch && validateQueryMatch[1] in schemaStrictness
            ? schemaStrictness[validateQueryMatch[1]]
            : null,
        likelyQueryConsumer,
        controllerUsesReqQuery,
        controllerUsesValidatedQuery,
      });
    }
  }

  endpoints.sort((a, b) => {
    if (a.file !== b.file) return a.file.localeCompare(b.file);
    if (a.method !== b.method) return a.method.localeCompare(b.method);
    return a.routePath.localeCompare(b.routePath);
  });

  const missingValidateQuery = endpoints.filter(
    (endpoint) => endpoint.likelyQueryConsumer && !endpoint.hasValidateQuery
  );
  const directReqQuery = endpoints.filter(
    (endpoint) =>
      endpoint.hasValidateQuery &&
      endpoint.controllerUsesReqQuery &&
      !endpoint.controllerUsesValidatedQuery
  );
  const nonStrictQuerySchema = endpoints.filter(
    (endpoint) => endpoint.hasValidateQuery && endpoint.querySchemaStrict === false
  );

  return {
    totals: {
      routeEndpoints: endpoints.length,
      missingValidateQuery: missingValidateQuery.length,
      directReqQuery: directReqQuery.length,
      nonStrictQuerySchema: nonStrictQuerySchema.length,
    },
    missingValidateQuery,
    directReqQuery,
    nonStrictQuerySchema,
    endpoints,
  };
};

module.exports = {
  buildAudit,
};
