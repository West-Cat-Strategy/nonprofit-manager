#!/usr/bin/env node

const { collectRouteCatalogDriftIssues } = require('./lib/route-audit.ts');

const { issues } = collectRouteCatalogDriftIssues();

if (issues.length > 0) {
  console.error('Route catalog drift check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Route catalog drift check passed.');
