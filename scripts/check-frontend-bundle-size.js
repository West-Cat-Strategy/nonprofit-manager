#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const repoRoot = path.resolve(__dirname, '..');
const distIndexPath = path.join(repoRoot, 'frontend', 'dist', 'index.html');
const thresholdsPath = path.join(repoRoot, 'docs', 'performance', 'p4-t9d-thresholds.json');

const fail = (message) => {
  console.error(`Frontend bundle size check failed: ${message}`);
  process.exit(1);
};

if (!fs.existsSync(distIndexPath)) {
  fail('frontend/dist/index.html was not found. Run `cd frontend && npm run build` first.');
}

if (!fs.existsSync(thresholdsPath)) {
  fail('docs/performance/p4-t9d-thresholds.json was not found.');
}

const thresholds = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'));
const startupBundleCap = Number(thresholds.appOwnedStartupJsBytesCap);

if (!Number.isFinite(startupBundleCap) || startupBundleCap <= 0) {
  fail('appOwnedStartupJsBytesCap is missing or invalid in docs/performance/p4-t9d-thresholds.json.');
}

const html = fs.readFileSync(distIndexPath, 'utf8');
const scriptMatch = html.match(
  /<script\s+type=["']module["'][^>]*\ssrc=["']([^"']+)["'][^>]*><\/script>/i
);

if (!scriptMatch) {
  fail('could not find the startup module script in frontend/dist/index.html.');
}

const scriptHref = scriptMatch[1].split('?')[0].split('#')[0];
const scriptPath = path.resolve(path.dirname(distIndexPath), scriptHref.replace(/^\//, ''));

if (!fs.existsSync(scriptPath)) {
  fail(`startup bundle ${scriptHref} was not found on disk.`);
}

const rawBytes = fs.statSync(scriptPath).size;
const gzipBytes = zlib.gzipSync(fs.readFileSync(scriptPath)).length;
const relScriptPath = path.relative(repoRoot, scriptPath);

console.log(`Startup bundle: ${relScriptPath}`);
console.log(`Raw bytes: ${rawBytes}`);
console.log(`Gzip bytes: ${gzipBytes}`);
console.log(`Cap: ${startupBundleCap}`);

if (rawBytes > startupBundleCap) {
  fail(`startup bundle exceeds cap by ${rawBytes - startupBundleCap} bytes.`);
}

console.log('Frontend bundle size check passed.');
