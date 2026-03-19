#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  readBaselineJson,
  readText,
  walkFiles,
} = require('./lib/policy-utils.ts');
const {
  collectRouteCatalogDriftIssues,
  collectRouteIntegrityIssues,
} = require('./lib/route-audit.ts');

const enforceBaseline = process.argv.includes('--enforce-baseline');
const baseline = readBaselineJson('docs/ui/app-ux-audit.json');

function collectStyleAudit() {
  const frontendFiles = walkFiles(path.join(repoRoot, 'frontend/src'), {
    extensions: ['.ts', '.tsx'],
    includeTests: false,
    filter: (filePath) => !filePath.includes(`${path.sep}routeCatalog${path.sep}`),
  });

  let hardcodedColorUtilities = 0;
  let semanticTokenUtilities = 0;
  let inlineStyleUsages = 0;

  const hardcodedPattern = /\b(?:bg|text|border|ring|shadow|fill|stroke|outline|accent|caret|divide|from|via|to)-(?!(?:app|current|inherit|transparent|white|black)\b)[a-z]+(?:-\d{2,3})?\b/g;
  const semanticPattern = /\b(?:bg|text|border|ring|shadow|fill|stroke|outline|accent|caret|divide|from|via|to)-app-[a-z0-9-]+\b/g;
  const inlineStylePattern = /\bstyle=\{\{/g;

  for (const filePath of frontendFiles) {
    const text = readText(filePath);
    hardcodedColorUtilities += (text.match(hardcodedPattern) || []).length;
    semanticTokenUtilities += (text.match(semanticPattern) || []).length;
    inlineStyleUsages += (text.match(inlineStylePattern) || []).length;
  }

  return {
    hardcodedColorUtilities,
    semanticTokenUtilities,
    inlineStyleUsages,
  };
}

const routeIntegrity = collectRouteIntegrityIssues();
const routeCatalogDrift = collectRouteCatalogDriftIssues();
const styleAudit = collectStyleAudit();

const expectedRouteIntegrityPassed =
  baseline?.postFix?.staticAudit?.routeIntegrityPassed === true;
const expectedRouteCatalogDriftPassed =
  baseline?.postFix?.staticAudit?.routeCatalogDriftPassed === true;
const expectedStyleAudit = baseline?.postFix?.staticAudit?.styleAudit || null;

const issues = [...routeIntegrity.issues, ...routeCatalogDrift.issues];

if (issues.length > 0) {
  console.error('UI audit failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

if (
  expectedRouteIntegrityPassed !== true ||
  expectedRouteCatalogDriftPassed !== true
) {
  console.error('UI audit failed:\n- docs/ui/app-ux-audit.json does not describe a passing static audit baseline.');
  process.exit(1);
}

if (
  expectedStyleAudit &&
  (
    styleAudit.hardcodedColorUtilities !== expectedStyleAudit.hardcodedColorUtilities ||
    styleAudit.semanticTokenUtilities !== expectedStyleAudit.semanticTokenUtilities ||
    styleAudit.inlineStyleUsages !== expectedStyleAudit.inlineStyleUsages
  )
) {
  console.error('UI audit failed:\n');
  console.error(
    `- Style audit mismatch. Expected ${expectedStyleAudit.hardcodedColorUtilities}/${expectedStyleAudit.semanticTokenUtilities}/${expectedStyleAudit.inlineStyleUsages}, got ${styleAudit.hardcodedColorUtilities}/${styleAudit.semanticTokenUtilities}/${styleAudit.inlineStyleUsages}.`
  );
  process.exit(1);
}

if (enforceBaseline && baseline?.postFix?.staticAudit?.disallowedInlineStylePaths?.length !== 0) {
  console.error('UI audit failed:\n- Baseline contains disallowed inline-style hotspots.');
  process.exit(1);
}

console.log('UI audit passed.');
console.log(`Route integrity: pass`);
console.log(`Route catalog drift: pass`);
console.log(`Hardcoded color utilities: ${styleAudit.hardcodedColorUtilities}`);
console.log(`Semantic token utilities: ${styleAudit.semanticTokenUtilities}`);
console.log(`Inline style usages: ${styleAudit.inlineStyleUsages}`);
