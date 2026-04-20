#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  failIfIssues,
  relativeToRepo,
  repoRoot,
} = require('./lib/policy-utils.ts');

const legacyControllerPath = path.join(repoRoot, 'backend/src/controllers');
const issues = [];

if (fs.existsSync(legacyControllerPath)) {
  const relativePath = relativeToRepo(legacyControllerPath);
  issues.push(`${relativePath} exists but must stay deleted.`);

  const stat = fs.statSync(legacyControllerPath);
  if (stat.isDirectory()) {
    const entries = fs.readdirSync(legacyControllerPath).sort();
    if (entries.length === 0) {
      issues.push(`${relativePath} is an empty legacy directory; remove it instead of restoring the path.`);
    } else {
      for (const entry of entries) {
        issues.push(`${relativePath}/${entry} keeps the deleted legacy controller path alive.`);
      }
    }
  } else {
    issues.push(`${relativePath} was recreated as a file; keep the deleted legacy controller path absent.`);
  }
}

failIfIssues(
  'Backend legacy controller path absence check failed:',
  issues,
  'Backend legacy controller path absence check complete.'
);
