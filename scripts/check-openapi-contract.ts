#!/usr/bin/env node

const path = require('path');
const YAML = require('yaml');
const {
  failIfIssues,
  readText,
  repoRoot,
} = require('./lib/policy-utils.ts');

const httpMethods = new Set([
  'get',
  'put',
  'post',
  'delete',
  'options',
  'head',
  'patch',
  'trace',
]);

function pointerSegmentToKey(segment) {
  return segment.replace(/~1/g, '/').replace(/~0/g, '~');
}

function resolveLocalRef(documentValue, ref) {
  if (!ref.startsWith('#/')) {
    return undefined;
  }

  return ref
    .slice(2)
    .split('/')
    .map(pointerSegmentToKey)
    .reduce((current, key) => {
      if (current && typeof current === 'object') {
        return current[key];
      }
      return undefined;
    }, documentValue);
}

function walk(value, visitor, trail = []) {
  visitor(value, trail);

  if (Array.isArray(value)) {
    value.forEach((entry, index) => walk(entry, visitor, [...trail, String(index)]));
    return;
  }

  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      walk(entry, visitor, [...trail, key]);
    }
  }
}

function formatTrail(trail) {
  return trail.length === 0 ? '<root>' : trail.join('.');
}

function collectTemplateParameters(routePath) {
  return [...routePath.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
}

function operationParameters(documentValue, pathItem, operation) {
  return [...(pathItem.parameters || []), ...(operation.parameters || [])].map((parameter) => {
    if (parameter && typeof parameter.$ref === 'string') {
      return resolveLocalRef(documentValue, parameter.$ref) || parameter;
    }
    return parameter;
  });
}

function analyzeSchemaRequiredFields(schema, trail, issues) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    return;
  }

  if (Array.isArray(schema.required)) {
    const properties = schema.properties && typeof schema.properties === 'object'
      ? schema.properties
      : {};
    for (const requiredField of schema.required) {
      if (!Object.prototype.hasOwnProperty.call(properties, requiredField)) {
        issues.push(`${formatTrail(trail)} requires '${requiredField}' but does not define it under properties.`);
      }
    }
  }
}

function analyzeOpenApiContract(root = repoRoot, relativePath = 'docs/api/openapi.yaml') {
  const openapiPath = path.join(root, relativePath);
  const text = readText(openapiPath);
  const document = YAML.parseDocument(text, { prettyErrors: false, uniqueKeys: true });
  const issues = [];

  for (const error of document.errors) {
    issues.push(`YAML parse error: ${error.message}`);
  }

  for (const warning of document.warnings) {
    issues.push(`YAML warning: ${warning.message}`);
  }

  if (issues.length > 0) {
    return issues;
  }

  const value = document.toJSON();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return ['OpenAPI document must be a mapping/object.'];
  }

  if (!/^3\.(0|1)\.\d+$/.test(String(value.openapi || ''))) {
    issues.push('openapi must declare a supported 3.0.x or 3.1.x version.');
  }

  if (!value.info?.title || !value.info?.version) {
    issues.push('info.title and info.version are required.');
  }

  if (!Array.isArray(value.servers) || value.servers.length === 0) {
    issues.push('servers must list at least one local or deployment base URL.');
  }

  if (!value.paths || typeof value.paths !== 'object' || Array.isArray(value.paths)) {
    issues.push('paths must be a non-empty object.');
    return issues;
  }

  const pathEntries = Object.entries(value.paths);
  if (pathEntries.length === 0) {
    issues.push('paths must contain at least one documented route.');
  }

  for (const [routePath, pathItem] of pathEntries) {
    if (!routePath.startsWith('/')) {
      issues.push(`Path '${routePath}' must start with '/'.`);
    }

    if (routePath.startsWith('/api/v2/')) {
      issues.push(`Path '${routePath}' should be relative to the /api/v2 server base URL.`);
    }

    if (!pathItem || typeof pathItem !== 'object' || Array.isArray(pathItem)) {
      issues.push(`Path '${routePath}' must map to an operation object.`);
      continue;
    }

    const operations = Object.entries(pathItem).filter(([key]) => httpMethods.has(key));
    if (operations.length === 0) {
      issues.push(`Path '${routePath}' does not define any HTTP operations.`);
    }

    for (const [method, operation] of operations) {
      const operationTrail = `paths.${routePath}.${method}`;
      if (!operation || typeof operation !== 'object' || Array.isArray(operation)) {
        issues.push(`${operationTrail} must be an object.`);
        continue;
      }

      if (!operation.summary) {
        issues.push(`${operationTrail} must include a summary.`);
      }

      if (!operation.responses || typeof operation.responses !== 'object') {
        issues.push(`${operationTrail} must include responses.`);
      } else {
        for (const statusCode of Object.keys(operation.responses)) {
          if (statusCode !== 'default' && !/^[1-5][0-9][0-9]$/.test(statusCode)) {
            issues.push(`${operationTrail}.responses.${statusCode} must be an HTTP status code or default.`);
          }
        }
      }

      const parameters = operationParameters(value, pathItem, operation);
      for (const templateParameter of collectTemplateParameters(routePath)) {
        const parameter = parameters.find((entry) => entry?.in === 'path' && entry?.name === templateParameter);
        if (!parameter) {
          issues.push(`${operationTrail} is missing path parameter '${templateParameter}'.`);
        } else if (parameter.required !== true) {
          issues.push(`${operationTrail} path parameter '${templateParameter}' must set required: true.`);
        }
      }
    }
  }

  walk(value, (entry, trail) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return;
    }

    if (typeof entry.$ref === 'string') {
      if (!entry.$ref.startsWith('#/')) {
        issues.push(`${formatTrail(trail)} uses external ref '${entry.$ref}'; keep docs/api/openapi.yaml self-contained.`);
      } else if (resolveLocalRef(value, entry.$ref) === undefined) {
        issues.push(`${formatTrail(trail)} references missing component '${entry.$ref}'.`);
      }
    }

    analyzeSchemaRequiredFields(entry, trail, issues);
  });

  return issues;
}

function runOpenApiContractCheck(root = repoRoot, relativePath = process.argv[2] || 'docs/api/openapi.yaml') {
  const issues = analyzeOpenApiContract(root, relativePath);
  failIfIssues('OpenAPI contract check failed:', issues, 'OpenAPI contract check passed.');
}

if (require.main === module) {
  runOpenApiContractCheck();
}

module.exports = {
  analyzeOpenApiContract,
  resolveLocalRef,
};
