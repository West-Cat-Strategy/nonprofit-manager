#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../..');
const defaultSkipDirs = new Set([
  '.git',
  '.next',
  'coverage',
  'dist',
  'dist.bak',
  'node_modules',
  'output',
  'tmp',
]);

function relativeToRepo(filePath) {
  return path.relative(repoRoot, filePath);
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function lineCount(filePath) {
  return readText(filePath).split(/\r?\n/).length;
}

function countMatches(text, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  let count = 0;
  while (regex.exec(text)) {
    count += 1;
    if (regex.lastIndex === 0) {
      regex.lastIndex += 1;
    }
  }
  return count;
}

function findMatches(text, pattern) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const regex = new RegExp(pattern.source, flags);
  const matches = [];
  let match;
  while ((match = regex.exec(text))) {
    matches.push(match);
    if (regex.lastIndex === 0) {
      regex.lastIndex += 1;
    }
  }
  return matches;
}

function walkFiles(rootDirs, options = {}) {
  const {
    extensions = null,
    skipDirs = defaultSkipDirs,
    includeTests = true,
    includeHidden = false,
    filter = null,
  } = options;

  const roots = Array.isArray(rootDirs) ? rootDirs : [rootDirs];
  const results = [];

  const visit = (currentDir) => {
    if (!fs.existsSync(currentDir)) {
      return;
    }

    const stat = fs.statSync(currentDir);
    if (stat.isFile()) {
      const ext = path.extname(currentDir).toLowerCase();
      const name = path.basename(currentDir);
      if (extensions && !extensions.includes(ext)) {
        return;
      }
      if (!includeTests && /\.(test|spec)\.[^.]+$/i.test(name)) {
        return;
      }
      if (filter && !filter(currentDir)) {
        return;
      }
      results.push(currentDir);
      return;
    }

    for (const entry of fs.readdirSync(currentDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) {
          continue;
        }
        if (!includeHidden && entry.name.startsWith('.')) {
          continue;
        }
      }
      visit(path.join(currentDir, entry.name));
    }
  };

  for (const root of roots) {
    visit(root);
  }

  return results.sort();
}

function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function directoryExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

function printIssues(title, issues) {
  if (issues.length === 0) {
    return;
  }

  // eslint-disable-next-line no-console
  console.error(`${title}\n`);
  for (const issue of issues) {
    // eslint-disable-next-line no-console
    console.error(`- ${issue}`);
  }
}

function failIfIssues(title, issues, successMessage) {
  if (issues.length > 0) {
    printIssues(title, issues);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(successMessage);
}

function readBaselineJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  if (!fileExists(filePath)) {
    return null;
  }
  return readJson(filePath);
}

module.exports = {
  repoRoot,
  defaultSkipDirs,
  relativeToRepo,
  readText,
  readJson,
  writeJson,
  ensureDir,
  lineCount,
  countMatches,
  findMatches,
  walkFiles,
  fileExists,
  directoryExists,
  printIssues,
  failIfIssues,
  readBaselineJson,
};

