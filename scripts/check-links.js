#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = process.cwd();

const IGNORED_DIR_NAMES = new Set([
  '.git',
  '.idea',
  '.vscode',
  '.next',
  '.turbo',
  '.cache',
  'coverage',
  'dist',
  'dist.bak',
  'node_modules',
  'playwright-report',
  'tmp',
]);

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);

const slugify = (value) =>
  value
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[`~!@#$%^&*()+=\[\]{}|\\;:'",.<>/?]/g, '')
    .replace(/\s/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeAnchor = (fragment) => {
  try {
    return decodeURIComponent(fragment).trim().replace(/^#/, '');
  } catch {
    return fragment.trim().replace(/^#/, '');
  }
};

const stripCodeFences = (text) => {
  const lines = text.split(/\r?\n/);
  const output = [];
  let fenceChar = null;
  let fenceSize = 0;

  for (const line of lines) {
    const fenceMatch = line.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      const size = fenceMatch[1].length;

      if (!fenceChar) {
        fenceChar = marker;
        fenceSize = size;
        continue;
      }

      if (marker === fenceChar && size >= fenceSize) {
        fenceChar = null;
        fenceSize = 0;
        continue;
      }
    }

    if (!fenceChar) {
      output.push(line);
    }
  }

  return output.join('\n');
};

const collectFiles = (startDir, predicate, results = []) => {
  for (const entry of fs.readdirSync(startDir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIR_NAMES.has(entry.name)) {
        continue;
      }

      const nextDir = path.join(startDir, entry.name);
      if (
        nextDir.includes(`${path.sep}docs${path.sep}phases${path.sep}archive`) ||
        nextDir.endsWith(`${path.sep}docs${path.sep}phases${path.sep}archive`)
      ) {
        continue;
      }

      collectFiles(nextDir, predicate, results);
      continue;
    }

    if (predicate(entry.name, startDir)) {
      results.push(path.join(startDir, entry.name));
    }
  }

  return results;
};

const markdownFiles = collectFiles(repoRoot, (name, dir) => {
  const ext = path.extname(name).toLowerCase();
  if (!MARKDOWN_EXTENSIONS.has(ext)) {
    return false;
  }

  const fullPath = path.join(dir, name);
  return !fullPath.includes(`${path.sep}node_modules${path.sep}`) &&
    !fullPath.includes(`${path.sep}coverage${path.sep}`) &&
    !fullPath.includes(`${path.sep}dist${path.sep}`) &&
    !fullPath.includes(`${path.sep}dist.bak${path.sep}`);
});

const linkPattern = /!?\[[^\]]*\]\(([^)]+)\)/g;
const issues = [];
let totalLinks = 0;

const readAnchors = (filePath) => {
  const text = fs.readFileSync(filePath, 'utf8');
  const cleaned = stripCodeFences(text);
  const anchors = new Set();

  for (const line of cleaned.split(/\r?\n/)) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (!headingMatch) {
      continue;
    }

    const headingText = headingMatch[2]
      .replace(/\s+\{#[^}]+\}\s*$/, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (headingText) {
      anchors.add(slugify(headingText));
    }
  }

  return anchors;
};

const anchorCache = new Map();

const getAnchorsFor = (filePath) => {
  const cacheKey = path.resolve(filePath);
  if (!anchorCache.has(cacheKey)) {
    anchorCache.set(cacheKey, readAnchors(filePath));
  }

  return anchorCache.get(cacheKey);
};

const isExternalLink = (target) =>
  /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target);

const isLineAnchor = (fragment) => /^L\d+(?:-L?\d+)?$/i.test(fragment);

for (const filePath of markdownFiles) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const text = stripCodeFences(raw);
  let match;

  while ((match = linkPattern.exec(text)) !== null) {
    const rawTarget = match[1].trim();
    const lineNumber = raw.slice(0, match.index).split(/\r?\n/).length;

    let target = rawTarget;
    if (target.startsWith('<') && target.endsWith('>')) {
      target = target.slice(1, -1).trim();
    }

    const titleIndex = target.search(/\s/);
    if (titleIndex !== -1) {
      target = target.slice(0, titleIndex);
    }

    if (!target || target.startsWith('#') || isExternalLink(target)) {
      if (target.startsWith('#')) {
        const fragment = normalizeAnchor(target);
        if (fragment && !isLineAnchor(fragment)) {
          const anchors = getAnchorsFor(filePath);
          if (!anchors.has(slugify(fragment))) {
            issues.push({
              file: path.relative(repoRoot, filePath),
              line: lineNumber,
              target,
              reason: 'missing anchor in current file',
            });
          }
        }
      }
      totalLinks += 1;
      continue;
    }

    const [rawPath, rawFragment = ''] = target.split('#');
    const normalizedPath = rawPath.split('?')[0];
    const resolvedPath = normalizedPath.startsWith('/')
      ? path.resolve(repoRoot, `.${normalizedPath}`)
      : path.resolve(path.dirname(filePath), normalizedPath);

    if (!fs.existsSync(resolvedPath)) {
      issues.push({
        file: path.relative(repoRoot, filePath),
        line: lineNumber,
        target,
        reason: `missing file: ${path.relative(repoRoot, resolvedPath) || normalizedPath}`,
      });
      totalLinks += 1;
      continue;
    }

    if (rawFragment) {
      const fragment = normalizeAnchor(rawFragment);
      if (fragment && !isLineAnchor(fragment)) {
        const ext = path.extname(resolvedPath).toLowerCase();
        if (MARKDOWN_EXTENSIONS.has(ext)) {
          const anchors = getAnchorsFor(resolvedPath);
          if (!anchors.has(slugify(fragment))) {
            issues.push({
              file: path.relative(repoRoot, filePath),
              line: lineNumber,
              target,
              reason: `missing anchor #${fragment} in ${path.relative(repoRoot, resolvedPath)}`,
            });
          }
        }
      }
    }

    totalLinks += 1;
  }
}

if (issues.length > 0) {
  console.error(`Found ${issues.length} broken link${issues.length === 1 ? '' : 's'} in ${markdownFiles.length} markdown files.`);
  for (const issue of issues) {
    console.error(`- ${issue.file}:${issue.line} -> ${issue.target} (${issue.reason})`);
  }
  process.exitCode = 1;
} else {
  console.log(`Checked ${markdownFiles.length} markdown files and ${totalLinks} links. No broken local markdown links found.`);
}
