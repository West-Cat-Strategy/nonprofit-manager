#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const v2RoutesPath = path.join(repoRoot, 'backend/src/routes/v2/index.ts');

if (!fs.existsSync(v2RoutesPath)) {
  console.error(`Missing v2 routes registrar: ${path.relative(repoRoot, v2RoutesPath)}`);
  process.exit(1);
}

const source = fs.readFileSync(v2RoutesPath, 'utf8');
const lines = source.split(/\r?\n/);
const violations = [];

for (let i = 0; i < lines.length; i += 1) {
  const line = lines[i];
  if (/from\s+['"]@routes\//.test(line)) {
    violations.push(`${path.relative(repoRoot, v2RoutesPath)}:${i + 1}: ${line.trim()}`);
  }
}

if (violations.length > 0) {
  console.error('V2 module ownership policy violations found. Use @modules/* imports only in backend/src/routes/v2/index.ts.');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('V2 module ownership policy check passed.');
