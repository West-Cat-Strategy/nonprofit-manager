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
  { id: 'AdminSettings', prefix: 'AdminSettings-', maxBytes: 180 * 1024 },
  { id: 'vendor-recharts', prefix: 'vendor-recharts-', maxBytes: 380 * 1024 },
  { id: 'vendor-pdf', prefix: 'vendor-pdf-', maxBytes: 450 * 1024 },
  { id: 'index-main', prefix: 'index-', maxBytes: 440 * 1024 },
];

const formatKb = (value) => `${(value / 1024).toFixed(1)} KiB`;

let hasViolation = false;

console.log('Frontend bundle budget report:');
for (const budget of budgets) {
  const match = jsFiles
    .filter((entry) => entry.file.startsWith(budget.prefix))
    .sort((a, b) => b.bytes - a.bytes)[0];

  if (!match) {
    console.error(`- ${budget.id}: missing chunk with prefix "${budget.prefix}"`);
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
