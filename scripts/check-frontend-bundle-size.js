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
const totalInitialJsCap = Number(thresholds.totalInitialJsBytesCap);

if (!Number.isFinite(startupBundleCap) || startupBundleCap <= 0) {
  fail(
    'appOwnedStartupJsBytesCap is missing or invalid in docs/performance/p4-t9d-thresholds.json.'
  );
}

if (!Number.isFinite(totalInitialJsCap) || totalInitialJsCap <= 0) {
  fail(
    'totalInitialJsBytesCap is missing or invalid in docs/performance/p4-t9d-thresholds.json.'
  );
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
const hrefToAsset = (href) => {
  const cleanHref = href.split('?')[0].split('#')[0].replace(/^\//, '');
  return path.resolve(path.dirname(distIndexPath), cleanHref);
};
const modulePreloadHrefs = Array.from(
  html.matchAll(
    /<link\s+[^>]*rel=["']modulepreload["'][^>]*href=["']([^"']+\.js(?:[?#][^"']*)?)["'][^>]*>/gi
  ),
  (match) => match[1]
);
const initialJsPaths = Array.from(
  new Set([scriptPath, ...modulePreloadHrefs.map(hrefToAsset)])
);
const missingInitialJsPath = initialJsPaths.find((initialJsPath) => !fs.existsSync(initialJsPath));

if (missingInitialJsPath) {
  fail(
    `initial JS asset ${path.relative(repoRoot, missingInitialJsPath)} was not found on disk.`
  );
}

const initialJsAssets = initialJsPaths.map((initialJsPath) => ({
  path: initialJsPath,
  rawBytes: fs.statSync(initialJsPath).size,
  gzipBytes: zlib.gzipSync(fs.readFileSync(initialJsPath)).length,
}));
const totalInitialRawBytes = initialJsAssets.reduce((total, asset) => total + asset.rawBytes, 0);
const totalInitialGzipBytes = initialJsAssets.reduce((total, asset) => total + asset.gzipBytes, 0);

console.log(`Startup bundle: ${relScriptPath}`);
console.log(`Raw bytes: ${rawBytes}`);
console.log(`Gzip bytes: ${gzipBytes}`);
console.log(`Cap: ${startupBundleCap}`);
console.log('Initial JS assets:');
for (const asset of initialJsAssets) {
  console.log(
    `- ${path.relative(repoRoot, asset.path)}: ${asset.rawBytes} raw / ${asset.gzipBytes} gzip`
  );
}
console.log(`Total initial JS raw bytes: ${totalInitialRawBytes}`);
console.log(`Total initial JS gzip bytes: ${totalInitialGzipBytes}`);
console.log(`Total initial JS cap: ${totalInitialJsCap}`);

if (rawBytes > startupBundleCap) {
  fail(`startup bundle exceeds cap by ${rawBytes - startupBundleCap} bytes.`);
}

if (totalInitialRawBytes > totalInitialJsCap) {
  fail(`total initial JS exceeds cap by ${totalInitialRawBytes - totalInitialJsCap} bytes.`);
}

console.log('Frontend bundle size check passed.');
