#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');

const expectedFile = path.join(repoRoot, 'backend/src/middleware/rateLimiter.ts');
const sourceFiles = walkFiles(path.join(repoRoot, 'backend/src'), {
  extensions: ['.ts'],
  includeTests: false,
});

const issues = [];
let expectedFileHits = 0;

for (const filePath of sourceFiles) {
  const text = readText(filePath);
  const keyGeneratorMatches = [...text.matchAll(/keyGenerator\s*:/g)];
  if (keyGeneratorMatches.length === 0) {
    continue;
  }

  if (filePath !== expectedFile) {
    issues.push(`${relativeToRepo(filePath)} contains keyGenerator logic outside backend/src/middleware/rateLimiter.ts`);
    continue;
  }

  expectedFileHits += keyGeneratorMatches.length;
  for (const match of keyGeneratorMatches) {
    const slice = text.slice(match.index, match.index + 300);
    if (!/rateLimitKeys\./.test(slice)) {
      const line = text.slice(0, match.index).split(/\r?\n/).length;
      issues.push(`${relativeToRepo(filePath)}:${line} keyGenerator does not use rateLimitKeys.*`);
    }
  }
}

if (issues.length > 0) {
  console.error('Rate-limit key policy check failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

if (expectedFileHits === 0) {
  console.error('Rate-limit key policy check failed:\n- No keyGenerator definitions were found in backend/src/middleware/rateLimiter.ts');
  process.exit(1);
}

console.log('Rate-limit key policy check passed.');
