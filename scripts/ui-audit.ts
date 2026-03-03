#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const frontendRoot = path.join(repoRoot, 'frontend', 'src');
const baselinePath = path.join(repoRoot, 'scripts', 'policies', 'ui-audit-baseline.json');

const HARD_CODED_COLOR_UTILITY_REGEX =
  /\b(?:bg|text|border|ring|divide|from|to|via)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/g;
const SEMANTIC_TOKEN_REGEX = /\b(?:bg|text|border|ring|divide)-app-[a-z-]+\b/g;
const INLINE_STYLE_REGEX = /style=\{\{/g;

const ALLOWED_DYNAMIC_INLINE_STYLE_PATHS = new Set([
  'frontend/src/components/editor/EditorCanvas.tsx',
  'frontend/src/pages/analytics/charts.tsx',
  'frontend/src/components/dashboard/EngagementChart.tsx',
  'frontend/src/components/dashboard/CaseSummaryWidget.tsx',
  'frontend/src/components/VolunteerWidget.tsx',
  'frontend/src/features/events/components/EventInfoPanel.tsx',
  'frontend/src/components/people/PeopleListContainer.tsx',
]);

function walkFiles(rootDir, predicate, acc = []) {
  if (!fs.existsSync(rootDir)) return acc;

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(fullPath, predicate, acc);
      continue;
    }

    if (entry.isFile() && predicate(fullPath)) {
      acc.push(fullPath);
    }
  }

  return acc;
}

function countMatches(source, regex) {
  return (source.match(regex) || []).length;
}

function toPosixRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

function runAudit() {
  const targetFiles = walkFiles(
    frontendRoot,
    (filePath) => filePath.endsWith('.tsx') || filePath.endsWith('.ts')
  );

  let hardcodedColorUtilities = 0;
  let semanticTokenUtilities = 0;
  let inlineStyleUsages = 0;

  const inlineStyleHotspots = [];
  const disallowedInlineStylePaths = [];

  for (const file of targetFiles) {
    const source = fs.readFileSync(file, 'utf8');
    const rel = toPosixRelative(file);

    const hardcodedCount = countMatches(source, HARD_CODED_COLOR_UTILITY_REGEX);
    const semanticCount = countMatches(source, SEMANTIC_TOKEN_REGEX);
    const inlineCount = countMatches(source, INLINE_STYLE_REGEX);

    hardcodedColorUtilities += hardcodedCount;
    semanticTokenUtilities += semanticCount;
    inlineStyleUsages += inlineCount;

    if (inlineCount > 0) {
      inlineStyleHotspots.push({ file: rel, count: inlineCount });
      if (!ALLOWED_DYNAMIC_INLINE_STYLE_PATHS.has(rel)) {
        disallowedInlineStylePaths.push(rel);
      }
    }
  }

  inlineStyleHotspots.sort((a, b) => b.count - a.count);

  return {
    generatedAt: new Date().toISOString(),
    scope: 'frontend/src/**/*.{ts,tsx}',
    metrics: {
      hardcodedColorUtilities,
      semanticTokenUtilities,
      inlineStyleUsages,
      ratioSemanticToHardcoded:
        hardcodedColorUtilities === 0
          ? null
          : Number((semanticTokenUtilities / hardcodedColorUtilities).toFixed(4)),
    },
    inlineStyleHotspots: inlineStyleHotspots.slice(0, 30),
    policy: {
      allowedDynamicInlineStylePaths: Array.from(ALLOWED_DYNAMIC_INLINE_STYLE_PATHS),
      disallowedInlineStylePaths,
    },
  };
}

function writeJson(targetPath, payload) {
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function parseArgs(argv) {
  return {
    writeBaseline: argv.includes('--write-baseline'),
    enforceBaseline: argv.includes('--enforce-baseline'),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = runAudit();

  if (args.writeBaseline) {
    writeJson(baselinePath, report);
    console.log(`UI audit baseline written: ${path.relative(repoRoot, baselinePath)}`);
    console.log(JSON.stringify(report.metrics, null, 2));
    return;
  }

  if (args.enforceBaseline) {
    if (!fs.existsSync(baselinePath)) {
      console.error(`Missing baseline file: ${path.relative(repoRoot, baselinePath)}`);
      process.exit(1);
    }

    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const violations = [];

    const maxHardcodedAllowed = Math.floor(
      Number(baseline.metrics.hardcodedColorUtilities) * 0.2
    );

    if (report.metrics.hardcodedColorUtilities > maxHardcodedAllowed) {
      violations.push(
        `Hardcoded color utility count ${report.metrics.hardcodedColorUtilities} exceeds 20% ceiling ${maxHardcodedAllowed} (baseline ${baseline.metrics.hardcodedColorUtilities})`
      );
    }

    const baselineDisallowed = new Set(
      Array.isArray(baseline?.policy?.disallowedInlineStylePaths)
        ? baseline.policy.disallowedInlineStylePaths
        : []
    );
    const newDisallowed = report.policy.disallowedInlineStylePaths.filter(
      (file) => !baselineDisallowed.has(file)
    );

    if (newDisallowed.length > 0) {
      violations.push(`Found newly disallowed inline style usage in: ${newDisallowed.join(', ')}`);
    }

    if (violations.length > 0) {
      console.error('UI audit policy check failed:');
      for (const violation of violations) {
        console.error(`- ${violation}`);
      }
      process.exit(1);
    }

    console.log('UI audit policy check passed.');
    console.log(JSON.stringify(report.metrics, null, 2));
    return;
  }

  console.log(JSON.stringify(report, null, 2));
}

main();
