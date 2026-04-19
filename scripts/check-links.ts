#!/usr/bin/env node

const {
  normalizeRelativePath,
  collectDocsAuditFiles,
} = require('./lib/docs-audit.ts');
const { readText, repoRoot } = require('./lib/policy-utils.ts');

const markdownLink = /!?\[[^\]]*\]\(([^)]+)\)/g;
const htmlLink = /(?:href|src)=["']([^"']+)["']/g;
const fencedCodeMarker = /^\s*(```|~~~)/;
const placeholder = 'github.com/example/nonprofit-manager';

function parseMarkdownLinks(text) {
  const matches = [];
  let inFence = false;

  for (const line of text.split(/\r?\n/)) {
    if (fencedCodeMarker.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) {
      continue;
    }

    for (const match of line.matchAll(markdownLink)) {
      matches.push(match[1].trim());
    }
  }

  return matches;
}

function parseHtmlLinks(text) {
  return [...text.matchAll(htmlLink)].map((match) => match[1].trim());
}

function normalizeTarget(target) {
  let normalized = target.trim();
  if (normalized.startsWith('<') && normalized.endsWith('>')) {
    normalized = normalized.slice(1, -1).trim();
  }
  normalized = normalized.split('#', 1)[0];
  normalized = normalized.split('?', 1)[0];
  return normalized;
}

function isExternalTarget(target) {
  const lowered = target.toLowerCase();
  return lowered.startsWith('http://')
    || lowered.startsWith('https://')
    || lowered.startsWith('mailto:')
    || lowered.startsWith('tel:')
    || lowered.startsWith('javascript:');
}

function main() {
  const files = collectDocsAuditFiles();
  const issues = [];
  let checkedLinks = 0;

  for (const filePath of files) {
    const text = readText(filePath);
    const relativePath = normalizeRelativePath(filePath);

    if (text.includes(placeholder)) {
      issues.push(`${relativePath}: placeholder GitHub example link found`);
    }

    const rawTargets = filePath.endsWith('.html') || filePath.endsWith('.htm')
      ? parseHtmlLinks(text)
      : parseMarkdownLinks(text);

    for (const rawTarget of rawTargets) {
      const target = normalizeTarget(rawTarget);
      if (!target || target.startsWith('#') || isExternalTarget(target)) {
        continue;
      }

      checkedLinks += 1;
      const resolvedTarget = require('path').resolve(require('path').dirname(filePath), target);
      const normalizedResolved = normalizeRelativePath(resolvedTarget);

      if (normalizedResolved.startsWith('..')) {
        issues.push(`${relativePath} -> ${rawTarget}: resolves outside the repository`);
        continue;
      }

      if (!require('fs').existsSync(resolvedTarget)) {
        issues.push(`${relativePath} -> ${rawTarget}: target does not exist`);
      }
    }
  }

  if (issues.length > 0) {
    console.error('Link check failed:\n');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    console.error(`\nChecked ${files.length} files and ${checkedLinks} local links.`);
    process.exit(1);
  }

  console.log(`Checked ${files.length} files and ${checkedLinks} local links. No broken active-doc links found.`);
}

if (require.main === module) {
  main();
}

module.exports = {
  isExternalTarget,
  normalizeTarget,
  parseHtmlLinks,
  parseMarkdownLinks,
  main,
};
