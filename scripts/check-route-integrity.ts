#!/usr/bin/env node

const { collectRouteIntegrityIssues } = require('./lib/route-audit.ts');

const { issues } = collectRouteIntegrityIssues();

if (issues.length > 0) {
  console.error('Route integrity check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Route integrity check passed.');
