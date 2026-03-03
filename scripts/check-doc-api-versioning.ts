#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const docsRoot = path.join(repoRoot, 'docs');

const allowedFilePatterns = [
  /^docs\/deployment\/PLAUSIBLE_SETUP\.md$/,
  /^docs\/development\/WC_MANAGE_PATTERN_ADOPTION_AUDIT\.md$/,
  /^docs\/development\/reference-patterns\//,
  /^docs\/phases\//,
];

const patternChecks = [
  {
    label: 'Local app URL contains legacy /api/* path',
    regex: /\bhttps?:\/\/(?:localhost|127\.0\.0\.1)[^\s"'`]*\/api\/(?!v(?:[2-9]\d*)(?:\/|\b))/,
  },
  {
    label: 'Localhost URL contains legacy /api/* path',
    regex: /\b(?:localhost|127\.0\.0\.1)(?::\d+)?\/api\/(?!v(?:[2-9]\d*)(?:\/|\b))/,
  },
  {
    label: 'Route example contains legacy /api/* path',
    regex: /(^|[\s"'`(])\/api\/(?!v(?:[2-9]\d*)(?:\/|\b))[a-z]/,
  },
];

const isAllowedFile = (relativePath: string): boolean =>
  allowedFilePatterns.some((pattern) => pattern.test(relativePath));

const isAllowedLine = (line: string): boolean => {
  if (!line.includes('/api/*')) return false;
  const normalized = line.toLowerCase();
  return (
    normalized.includes('legacy') ||
    normalized.includes('removed') ||
    normalized.includes('tombstone') ||
    normalized.includes('migration') ||
    normalized.includes('/api/v2')
  );
};

const collectMarkdownFiles = (dir: string, relPrefix = 'docs'): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const absPath = path.join(dir, entry.name);
    const relPath = `${relPrefix}/${entry.name}`;

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(absPath, relPath));
      continue;
    }

    if (!entry.isFile()) continue;
    if (!entry.name.endsWith('.md') && !entry.name.endsWith('.mdx')) continue;

    files.push(relPath);
  }

  return files;
};

const violations: Array<{
  file: string;
  lineNumber: number;
  rule: string;
  line: string;
}> = [];

for (const relativePath of collectMarkdownFiles(docsRoot)) {
  if (isAllowedFile(relativePath)) continue;

  const absPath = path.join(repoRoot, relativePath);
  const source = fs.readFileSync(absPath, 'utf8');
  const lines = source.split(/\r?\n/);

  lines.forEach((line: string, index: number) => {
    if (!line.includes('/api/')) return;
    if (line.includes('/api/v2/')) return;
    if (isAllowedLine(line)) return;

    for (const check of patternChecks) {
      if (check.regex.test(line)) {
        violations.push({
          file: relativePath,
          lineNumber: index + 1,
          rule: check.label,
          line: line.trim(),
        });
        break;
      }
    }
  });
}

if (violations.length > 0) {
  console.error('Documentation API versioning check failed.');
  console.error('Use /api/v2/* routes or /health* endpoints in project docs examples.');
  for (const violation of violations) {
    console.error(
      `- ${violation.file}:${violation.lineNumber} (${violation.rule}) ${violation.line}`
    );
  }
  process.exit(1);
}

console.log('Documentation API versioning check passed.');
