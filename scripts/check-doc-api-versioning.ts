#!/usr/bin/env node
const {
  collectDocsAuditFiles,
  docsApiV1AllowedFiles,
  normalizeRelativePath,
} = require('./lib/docs-audit.ts');
const { readText } = require('./lib/policy-utils.ts');

const disallowedPatterns = [
  { pattern: /API Version:\s*v1\b/gi, label: 'API Version: v1' },
  { pattern: /\/api\/v1\b/gi, label: '/api/v1' },
  { pattern: /legacy\s+\/api\/\*/gi, label: 'legacy /api/*' },
];
const files = collectDocsAuditFiles();
const violations = [];

for (const file of files) {
  const text = readText(file);
  const rel = normalizeRelativePath(file);

  for (const { pattern, label } of disallowedPatterns) {
    if (label === '/api/v1' && docsApiV1AllowedFiles.has(rel)) {
      continue;
    }
    for (const match of text.matchAll(pattern)) {
      const line = text.slice(0, match.index).split('\n').length;
      violations.push(`${rel}:${line}: ${label}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Docs API versioning check failed:\n');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log(`Checked ${files.length} active-doc files. No stale API-version references found.`);
