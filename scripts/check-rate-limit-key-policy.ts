#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..', 'backend', 'src', 'middleware');

const violations = [];

const isCodeFile = (name) => /\.ts$/.test(name) && !/\.test\.ts$/.test(name);

const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!isCodeFile(entry.name)) continue;

    const source = fs.readFileSync(fullPath, 'utf8');

    const keyGeneratorRegex = /keyGenerator\s*:\s*\(([^)]*)\)\s*=>\s*([^,\n]+)/g;
    let match;
    while ((match = keyGeneratorRegex.exec(source)) !== null) {
      const expression = (match[2] || '').trim();
      if (!expression.includes('rateLimitKeys.')) {
        const line = source.slice(0, match.index).split(/\r?\n/).length;
        violations.push({
          file: path.relative(path.resolve(__dirname, '..'), fullPath),
          line,
          reason: 'keyGenerator must use rateLimitKeys helper',
        });
      }
    }

    const rawLiteralRegex = /keyGenerator\s*:\s*\(([^)]*)\)\s*=>\s*(`[^`]+`|'[^']+'|"[^"]+")/g;
    while ((match = rawLiteralRegex.exec(source)) !== null) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      violations.push({
        file: path.relative(path.resolve(__dirname, '..'), fullPath),
        line,
        reason: 'raw literal keyGenerator values are blocked',
      });
    }
  }
};

walk(root);

if (violations.length > 0) {
  console.error('Rate-limit key policy violations found. Use @utils/rateLimitKeys helpers.');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} ${violation.reason}`);
  }
  process.exit(1);
}

console.log('Rate-limit key policy check passed.');
