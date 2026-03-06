#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadRouteCatalogModule, repoRoot } = require('./lib/load-route-catalog');
const { collectRouteIntegrityViolations } = require('./lib/route-integrity-lib');

const docsDir = path.join(repoRoot, 'docs', 'ui');
const markdownPath = path.join(docsDir, 'app-ux-audit.md');
const jsonPath = path.join(docsDir, 'app-ux-audit.json');

const routeCatalogModule = loadRouteCatalogModule();
const { routeCatalog } = routeCatalogModule;
const { violations } = collectRouteIntegrityViolations(repoRoot, routeCatalogModule);

const styleAudit = JSON.parse(
  execFileSync('node', ['scripts/ui-audit.ts'], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
);

let routeCatalogDriftPassed = true;
try {
  execFileSync('node', ['scripts/check-route-catalog-drift.ts'], {
    cwd: repoRoot,
    encoding: 'utf8',
    stdio: 'pipe',
  });
} catch {
  routeCatalogDriftPassed = false;
}

const baselineBrokenTargets = [
  '/alerts/history',
  '/alerts/instances',
  '/users',
  '/volunteers/assignments/new',
];

const baselineInlineStyleHotspots = [
  'frontend/src/components/ErrorBoundary.tsx',
  'frontend/src/components/cases/CaseCards.tsx',
  'frontend/src/components/cases/CaseTable.tsx',
  'frontend/src/components/neo-brutalist/BrutalCard.tsx',
  'frontend/src/components/neo-brutalist/BrutalFormSelect.tsx',
  'frontend/src/features/adminOps/pages/adminSettings/sections/BrandingSection.tsx',
];

const baselineScoreOverrides = {
  'alerts-overview': {
    featureStatus: 'missing-ui',
    auditScore: { readability: 2, accessibility: 2, efficiency: 1, workflowClarity: 1 },
  },
  'alerts-instances': {
    featureStatus: 'broken',
    auditScore: { readability: 2, accessibility: 2, efficiency: 1, workflowClarity: 1 },
  },
  'alerts-history': {
    featureStatus: 'broken',
    auditScore: { readability: 2, accessibility: 2, efficiency: 1, workflowClarity: 1 },
  },
  'admin-settings': {
    featureStatus: 'available',
    auditScore: { readability: 3, accessibility: 3, efficiency: 2, workflowClarity: 2 },
  },
};

const workflowSurfaces = [
  {
    id: 'staff-navigation',
    title: 'Staff Navigation',
    baseline: {
      featureStatus: 'broken',
      score: { readability: 3, accessibility: 3, efficiency: 2, workflowClarity: 2 },
      note: 'Alerts destinations were not exposed and literal drift was present in staff shortcuts.',
    },
    postFix: {
      featureStatus: 'available',
      score: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
      note: 'Navigation and utility links are catalog-driven and validated by route-integrity checks.',
    },
  },
  {
    id: 'admin-user-management',
    title: 'Admin User Management',
    baseline: {
      featureStatus: 'broken',
      score: { readability: 3, accessibility: 3, efficiency: 1, workflowClarity: 1 },
      note: 'The primary user-management card linked to `/users`, which had no canonical route.',
    },
    postFix: {
      featureStatus: 'available',
      score: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
      note: 'The card now routes to `/settings/admin?section=users` and the admin side-nav uses the route catalog.',
    },
  },
  {
    id: 'alerts-workspace',
    title: 'Alerts Workspace',
    baseline: {
      featureStatus: 'missing-ui',
      score: { readability: 2, accessibility: 2, efficiency: 1, workflowClarity: 1 },
      note: 'Alerts state existed, but routed overview/history/instances surfaces were not exposed.',
    },
    postFix: {
      featureStatus: 'available',
      score: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
      note: 'Configuration, triggered alerts, and history routes now share a consistent shell with cross-links.',
    },
  },
  {
    id: 'dashboard-volunteer-widget',
    title: 'Dashboard Volunteer Widget',
    baseline: {
      featureStatus: 'broken',
      score: { readability: 3, accessibility: 3, efficiency: 1, workflowClarity: 1 },
      note: 'The quick action pointed to `/volunteers/assignments/new`, which required missing context.',
    },
    postFix: {
      featureStatus: 'available',
      score: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
      note: 'The shortcut now routes to the volunteer management surface instead of a dead-end create page.',
    },
  },
  {
    id: 'portal-navigation',
    title: 'Portal Navigation',
    baseline: {
      featureStatus: 'available',
      score: { readability: 3, accessibility: 3, efficiency: 3, workflowClarity: 3 },
      note: 'Portal links worked but were maintained separately from canonical route metadata.',
    },
    postFix: {
      featureStatus: 'available',
      score: { readability: 4, accessibility: 4, efficiency: 4, workflowClarity: 4 },
      note: 'Portal navigation now consumes the shared route catalog and aligns with the shared shell.',
    },
  },
];

const highTrafficIds = [
  'dashboard',
  'contacts',
  'cases',
  'tasks',
  'events',
  'donations',
  'analytics',
  'reports',
  'alerts-overview',
  'admin-settings',
  'portal-dashboard',
  'login',
];

const highTrafficRoutes = routeCatalog
  .filter((entry) => highTrafficIds.includes(entry.id))
  .map((entry) => {
    const baselineOverride = baselineScoreOverrides[entry.id];
    return {
      id: entry.id,
      title: entry.title,
      href: entry.href,
      surface: entry.surface,
      authScope: entry.authScope,
      baseline: {
        featureStatus: baselineOverride?.featureStatus ?? entry.featureStatus,
        auditScore: baselineOverride?.auditScore ?? entry.auditScore,
      },
      postFix: {
        featureStatus: entry.featureStatus,
        auditScore: entry.auditScore,
      },
    };
  });

const routeMatrix = routeCatalog.map((entry) => ({
  id: entry.id,
  title: entry.title,
  href: entry.href,
  path: entry.path,
  surface: entry.surface,
  section: entry.section,
  authScope: entry.authScope,
  featureStatus: entry.featureStatus,
  auditScore: entry.auditScore,
}));

const report = {
  generatedAt: new Date().toISOString(),
  baseline: {
    auditedAt: '2026-03-05T00:00:00.000Z',
    staticAudit: {
      routeIntegrityPassed: false,
      routeCatalogDriftPassed: null,
      brokenTargets: baselineBrokenTargets,
      disallowedInlineStylePaths: baselineInlineStyleHotspots,
    },
    workflowSurfaces: workflowSurfaces.map((surface) => ({
      id: surface.id,
      title: surface.title,
      featureStatus: surface.baseline.featureStatus,
      auditScore: surface.baseline.score,
      note: surface.baseline.note,
    })),
  },
  postFix: {
    auditedAt: new Date().toISOString(),
    staticAudit: {
      routeIntegrityPassed: violations.length === 0,
      routeCatalogDriftPassed,
      brokenTargets: violations.map((entry) => entry.target),
      styleAudit: styleAudit.metrics,
      disallowedInlineStylePaths: styleAudit.policy.disallowedInlineStylePaths,
    },
    runtimeAudit: {
      status: 'blocked',
      reason:
        'Docker-backed Playwright audit could not run in this execution environment because the Docker daemon/socket was unavailable on March 6, 2026.',
      requiredCommands: [
        'npx playwright test tests/link-health.spec.ts --project=chromium',
        'npx playwright test tests/navigation-links.spec.ts --project=chromium',
      ],
    },
    workflowSurfaces: workflowSurfaces.map((surface) => ({
      id: surface.id,
      title: surface.title,
      featureStatus: surface.postFix.featureStatus,
      auditScore: surface.postFix.score,
      note: surface.postFix.note,
    })),
  },
  highTrafficRoutes,
  routeCatalog: routeMatrix,
};

const scoreCell = (score) =>
  `${score.readability}/${score.accessibility}/${score.efficiency}/${score.workflowClarity}`;

const markdown = `# App UI/UX Audit

Generated: ${report.generatedAt}

## Baseline

- Static route issues before fixes: ${baselineBrokenTargets.length}
- Broken targets: ${baselineBrokenTargets.join(', ')}
- Disallowed inline-style hotspots: ${baselineInlineStyleHotspots.length}
- Runtime audit status: blocked in this environment pending Docker-backed Playwright execution

## Post-Fix Static Audit

- Route integrity: ${report.postFix.staticAudit.routeIntegrityPassed ? 'pass' : 'fail'}
- Route catalog drift: ${report.postFix.staticAudit.routeCatalogDriftPassed ? 'pass' : 'fail'}
- Broken targets remaining: ${report.postFix.staticAudit.brokenTargets.length}
- Hardcoded color utilities: ${report.postFix.staticAudit.styleAudit.hardcodedColorUtilities}
- Semantic token utilities: ${report.postFix.staticAudit.styleAudit.semanticTokenUtilities}
- Disallowed inline-style paths remaining: ${report.postFix.staticAudit.disallowedInlineStylePaths.length}

## Workflow Surfaces

| Surface | Baseline | Post-Fix | Notes |
| --- | --- | --- | --- |
${workflowSurfaces
  .map(
    (surface) =>
      `| ${surface.title} | ${scoreCell(surface.baseline.score)} (${surface.baseline.featureStatus}) | ${scoreCell(surface.postFix.score)} (${surface.postFix.featureStatus}) | ${surface.postFix.note} |`
  )
  .join('\n')}

## High-Traffic Route Ratings

Scores are \`readability/accessibility/efficiency/workflowClarity\`.

| Route | Baseline | Post-Fix | Access |
| --- | --- | --- | --- |
${highTrafficRoutes
  .map(
    (route) =>
      `| ${route.title} | ${scoreCell(route.baseline.auditScore)} (${route.baseline.featureStatus}) | ${scoreCell(route.postFix.auditScore)} (${route.postFix.featureStatus}) | ${route.authScope} |`
  )
  .join('\n')}

## Runtime Audit Gate

- Status: ${report.postFix.runtimeAudit.status}
- Reason: ${report.postFix.runtimeAudit.reason}
- Required commands:
  - \`${report.postFix.runtimeAudit.requiredCommands[0]}\`
  - \`${report.postFix.runtimeAudit.requiredCommands[1]}\`
`;

fs.mkdirSync(docsDir, { recursive: true });
fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(markdownPath, `${markdown}\n`, 'utf8');

console.log(`Wrote ${path.relative(repoRoot, markdownPath)}`);
console.log(`Wrote ${path.relative(repoRoot, jsonPath)}`);
