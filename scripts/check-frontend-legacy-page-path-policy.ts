#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  failIfIssues,
  repoRoot,
  relativeToRepo,
} = require('./lib/policy-utils.ts');

const legacyPagePath = path.join(repoRoot, 'frontend/src/pages');
const issues = [];

if (fs.existsSync(legacyPagePath)) {
  const relativePath = relativeToRepo(legacyPagePath);
  issues.push(`${relativePath} exists but must stay deleted.`);

  const stat = fs.statSync(legacyPagePath);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(legacyPagePath).sort();
    if (entries.length === 0) {
      issues.push(`${relativePath} is an empty legacy directory; remove it instead of restoring the path.`);
    } else {
      for (const entry of entries) {
        issues.push(`${relativePath}/${entry} keeps the deleted legacy page path alive.`);
      }
    }
  } else {
    issues.push(`${relativePath} was recreated as a file; keep the deleted legacy page path absent.`);
  }
}

failIfIssues(
  'Frontend legacy page path absence check failed:',
  issues,
  'Frontend legacy page path absence check complete.'
);
