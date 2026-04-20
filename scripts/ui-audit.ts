#!/usr/bin/env node

const path = require('path');
const ts = require('typescript');
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
const baseline = readBaselineJson('docs/ui/archive/app-ux-audit.json');

const COLOR_UTILITY_PREFIXES = [
  'bg',
  'text',
  'border',
  'ring',
  'shadow',
  'fill',
  'stroke',
  'outline',
  'accent',
  'caret',
  'divide',
  'from',
  'via',
  'to',
];

const PALETTE_COLOR_NAMES = [
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
  'red',
  'orange',
  'amber',
  'yellow',
  'lime',
  'green',
  'emerald',
  'teal',
  'cyan',
  'sky',
  'blue',
  'indigo',
  'violet',
  'purple',
  'fuchsia',
  'pink',
  'rose',
  'black',
  'white',
];

const escapedUtilityPrefixes = COLOR_UTILITY_PREFIXES.join('|');
const escapedPaletteNames = PALETTE_COLOR_NAMES.join('|');

const semanticTokenPattern = new RegExp(
  `^(?:${escapedUtilityPrefixes})(?:-[a-z0-9]+)*-app-[a-z0-9-]+(?:\\/[a-z0-9.]+)?$`
);
const hardcodedColorTokenPattern = new RegExp(
  `^(?:${escapedUtilityPrefixes})(?:-[a-z0-9]+)*-(?:${escapedPaletteNames})(?:-\\d{1,3})?(?:\\/[a-z0-9.]+)?$`
);

function splitClassTokens(value) {
  return value
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function getBaseClassToken(token) {
  let squareDepth = 0;
  let parenDepth = 0;
  let lastVariantSeparator = -1;

  for (let index = 0; index < token.length; index += 1) {
    const character = token[index];
    if (character === '[') {
      squareDepth += 1;
    } else if (character === ']') {
      squareDepth = Math.max(0, squareDepth - 1);
    } else if (character === '(') {
      parenDepth += 1;
    } else if (character === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
    } else if (character === ':' && squareDepth === 0 && parenDepth === 0) {
      lastVariantSeparator = index;
    }
  }

  return token.slice(lastVariantSeparator + 1).replace(/^!/, '');
}

function classifyClassToken(token) {
  const baseToken = getBaseClassToken(token);

  if (semanticTokenPattern.test(baseToken)) {
    return 'semantic';
  }

  if (hardcodedColorTokenPattern.test(baseToken)) {
    return 'hardcoded';
  }

  return null;
}

function collectClassTokens(sourceFile) {
  const tokens = [];

  function visit(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      tokens.push(...splitClassTokens(node.text));
    } else if (ts.isTemplateExpression(node)) {
      tokens.push(...splitClassTokens(node.head.text));
      for (const span of node.templateSpans) {
        tokens.push(...splitClassTokens(span.literal.text));
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return tokens;
}

function countInlineStyleUsages(sourceFile) {
  let inlineStyleUsages = 0;

  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.text === 'style') {
      inlineStyleUsages += 1;
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return inlineStyleUsages;
}

function collectStyleAudit() {
  const frontendFiles = walkFiles(path.join(repoRoot, 'frontend/src'), {
    extensions: ['.ts', '.tsx'],
    includeTests: false,
    filter: (filePath) => !filePath.includes(`${path.sep}routeCatalog${path.sep}`),
  });

  let hardcodedColorUtilities = 0;
  let semanticTokenUtilities = 0;
  let inlineStyleUsages = 0;

  for (const filePath of frontendFiles) {
    const text = readText(filePath);
    const sourceFile = ts.createSourceFile(
      filePath,
      text,
      ts.ScriptTarget.Latest,
      true,
      filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    );

    for (const token of collectClassTokens(sourceFile)) {
      const tokenType = classifyClassToken(token);
      if (tokenType === 'semantic') {
        semanticTokenUtilities += 1;
      } else if (tokenType === 'hardcoded') {
        hardcodedColorUtilities += 1;
      }
    }

    inlineStyleUsages += countInlineStyleUsages(sourceFile);
  }

  return {
    hardcodedColorUtilities,
    semanticTokenUtilities,
    inlineStyleUsages,
    ratioSemanticToHardcoded: hardcodedColorUtilities === 0
      ? null
      : Number((semanticTokenUtilities / hardcodedColorUtilities).toFixed(4)),
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
  console.error('UI audit failed:\n- docs/ui/archive/app-ux-audit.json does not describe a passing static audit baseline.');
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
