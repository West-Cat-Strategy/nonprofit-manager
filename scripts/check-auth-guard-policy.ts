#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');

const allowedFile = path.join(repoRoot, 'backend/src/services/authGuardService.ts');
const sourceFiles = walkFiles(path.join(repoRoot, 'backend/src'), {
  extensions: ['.ts'],
  includeTests: false,
});
const legacyWrappers = [
  'requireUserOrError',
  'requireRoleOrError',
  'requirePermissionOrError',
  'requireAnyPermissionOrError',
  'requireOrganizationOrError',
];

const issues = [];

for (const filePath of sourceFiles) {
  if (filePath === allowedFile) {
    continue;
  }

  const text = readText(filePath);
  for (const wrapperName of legacyWrappers) {
    const pattern = new RegExp(`\\b${wrapperName}\\b`);
    const match = pattern.exec(text);
    if (!match) {
      continue;
    }

    const line = text.slice(0, match.index).split(/\r?\n/).length;
    issues.push(`${relativeToRepo(filePath)}:${line} uses legacy ${wrapperName}`);
  }
}

if (issues.length > 0) {
  console.error('Legacy auth-guard policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Legacy auth-guard policy check passed (no usage increase).');
