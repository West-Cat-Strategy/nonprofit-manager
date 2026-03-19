#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');

const allowedWrapper = path.join(repoRoot, 'backend/src/controllers/authController.ts');
const controllerFiles = walkFiles(path.join(repoRoot, 'backend/src/controllers'), {
  extensions: ['.ts'],
  includeTests: false,
});

const issues = [];

for (const filePath of controllerFiles) {
  const text = readText(filePath);
  const wrapperStyle = /export\s+\{[\s\S]*?\}\s+from\s+['"][^'"]+['"];?|export\s+\*\s+from\s+['"][^'"]+['"];?/.test(text);
  if (!wrapperStyle || filePath === allowedWrapper) {
    continue;
  }

  issues.push(`${relativeToRepo(filePath)} is a legacy controller wrapper but is not on the allowlist.`);
}

if (issues.length > 0) {
  console.error('Backend legacy controller wrapper policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log('Backend legacy controller wrapper check complete.');
