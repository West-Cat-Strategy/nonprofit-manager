#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  failIfIssues,
  repoRoot,
  relativeToRepo,
} = require('./lib/policy-utils.ts');

const legacySlicePath = path.join(repoRoot, 'frontend/src/store/slices');
const issues = [];

if (fs.existsSync(legacySlicePath)) {
  const relativePath = relativeToRepo(legacySlicePath);
  issues.push(`${relativePath} exists but must stay deleted.`);

  const stat = fs.statSync(legacySlicePath);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(legacySlicePath).sort();
    if (entries.length === 0) {
      issues.push(`${relativePath} is an empty legacy directory; remove it instead of restoring the path.`);
    } else {
      for (const entry of entries) {
        issues.push(`${relativePath}/${entry} keeps the deleted legacy slice path alive.`);
      }
    }
  } else {
    issues.push(`${relativePath} was recreated as a file; keep the deleted legacy slice path absent.`);
  }
}

failIfIssues(
  'Frontend legacy slice path absence check failed:',
  issues,
  'Frontend legacy slice path absence check complete.'
);
