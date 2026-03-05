#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'frontend', 'dist', 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('Frontend build artifacts not found at frontend/dist/assets. Run frontend build first.');
  process.exit(1);
}

const jsFiles = fs
  .readdirSync(assetsDir)
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({
    file,
    bytes: fs.statSync(path.join(assetsDir, file)).size,
  }));

const budgets = [
  { id: 'EventDetailPage', prefix: 'EventDetailPage-', maxBytes: 500 * 1024 },
  // Keep backward compatibility with historical chunk names.
  { id: 'AdminSettings', prefixes: ['AdminSettingsPage-', 'AdminSettings-'], maxBytes: 180 * 1024 },
  { id: 'vendor-recharts', prefix: 'vendor-recharts-', maxBytes: 380 * 1024 },
  { id: 'vendor-pdf', prefix: 'vendor-pdf-', maxBytes: 450 * 1024 },
  { id: 'index-main', prefix: 'index-', maxBytes: 320 * 1024 },
  { id: 'routes-core', prefix: 'routes-core-', maxBytes: 220 * 1024 },
  { id: 'routes-people', prefix: 'routes-people-', maxBytes: 120 * 1024 },
  { id: 'routes-engagement', prefix: 'routes-engagement-', maxBytes: 120 * 1024 },
  { id: 'routes-admin', prefix: 'routes-admin-', maxBytes: 120 * 1024 },
];

const formatKb = (value) => `${(value / 1024).toFixed(1)} KiB`;

let hasViolation = false;

console.log('Frontend bundle budget report:');
for (const budget of budgets) {
  const prefixes = budget.prefixes ?? [budget.prefix];
  const match = jsFiles
    .filter((entry) => prefixes.some((prefix) => entry.file.startsWith(prefix)))
    .sort((a, b) => b.bytes - a.bytes)[0];

  if (!match) {
    console.error(`- ${budget.id}: missing chunk with prefix "${prefixes.join('" or "')}"`);
    hasViolation = true;
    continue;
  }

  const status = match.bytes > budget.maxBytes ? 'FAIL' : 'PASS';
  console.log(
    `- ${budget.id}: ${status} (${formatKb(match.bytes)} / budget ${formatKb(budget.maxBytes)}) -> ${match.file}`
  );

  if (status === 'FAIL') {
    hasViolation = true;
  }
}

if (hasViolation) {
  console.error('Frontend bundle budget check failed.');
  process.exit(1);
}

console.log('Frontend bundle budget check passed.');
