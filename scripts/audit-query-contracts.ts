#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { buildAudit } = require('./query-contract-audit-lib');

const repoRoot = path.resolve(__dirname, '..');
const policyDir = path.join(repoRoot, 'scripts/policies');
const jsonOutputPath = path.join(policyDir, 'query-contract-audit-baseline.json');
const markdownOutputPath = path.join(policyDir, 'query-contract-audit-summary.md');

const writeMarkdownSummary = (audit) => {
  const lines = [
    '# Query Contract Audit Summary',
    '',
    `- Route endpoints scanned: ${audit.totals.routeEndpoints}`,
    `- MISSING_VALIDATE_QUERY: ${audit.totals.missingValidateQuery}`,
    `- DIRECT_REQ_QUERY: ${audit.totals.directReqQuery}`,
    `- NON_STRICT_QUERY_SCHEMA: ${audit.totals.nonStrictQuerySchema}`,
    '',
    '## MISSING_VALIDATE_QUERY',
    '',
  ];

  if (audit.missingValidateQuery.length === 0) {
    lines.push('- None');
  } else {
    for (const item of audit.missingValidateQuery) {
      lines.push(
        `- ${item.file}: ${item.method} ${item.routePath} (handler: ${item.handler || 'unknown'})`
      );
    }
  }

  lines.push('', '## DIRECT_REQ_QUERY', '');
  if (audit.directReqQuery.length === 0) {
    lines.push('- None');
  } else {
    for (const item of audit.directReqQuery) {
      lines.push(
        `- ${item.file}: ${item.method} ${item.routePath} (handler: ${item.handler || 'unknown'})`
      );
    }
  }

  lines.push('', '## NON_STRICT_QUERY_SCHEMA', '');
  if (audit.nonStrictQuerySchema.length === 0) {
    lines.push('- None');
  } else {
    for (const item of audit.nonStrictQuerySchema) {
      lines.push(
        `- ${item.file}: ${item.method} ${item.routePath} (schema: ${item.querySchema || 'unknown'})`
      );
    }
  }

  lines.push('');
  return `${lines.join('\n')}`;
};

const main = () => {
  const audit = buildAudit(repoRoot);
  fs.mkdirSync(policyDir, { recursive: true });
  fs.writeFileSync(jsonOutputPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  fs.writeFileSync(markdownOutputPath, writeMarkdownSummary(audit), 'utf8');
  console.log('Query contract audit artifacts updated.');
  console.log(`- ${path.relative(repoRoot, jsonOutputPath)}`);
  console.log(`- ${path.relative(repoRoot, markdownOutputPath)}`);
};

main();

