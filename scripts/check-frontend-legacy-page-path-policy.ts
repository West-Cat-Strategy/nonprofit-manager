#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const frontendRoot = path.join(repoRoot, 'frontend/src');

const forbiddenLegacyPageFiles = [
  'frontend/src/pages/analytics/Analytics.tsx',
  'frontend/src/pages/analytics/CustomDashboard.tsx',
  'frontend/src/pages/analytics/OutcomesReport.tsx',
  'frontend/src/pages/analytics/ReportBuilder.tsx',
  'frontend/src/pages/analytics/ReportTemplates.tsx',
  'frontend/src/pages/analytics/SavedReports.tsx',
  'frontend/src/pages/analytics/ScheduledReports.tsx',
  'frontend/src/pages/analytics/charts.tsx',
  'frontend/src/pages/analytics/metrics.tsx',
  'frontend/src/pages/analytics/utils.ts',
  'frontend/src/pages/engagement/cases/CaseCreate.tsx',
  'frontend/src/pages/engagement/cases/CaseDetail.tsx',
  'frontend/src/pages/engagement/cases/CaseEdit.tsx',
  'frontend/src/pages/engagement/cases/CaseList.tsx',
  'frontend/src/pages/engagement/tasks/TaskCreate.tsx',
  'frontend/src/pages/engagement/tasks/TaskDetail.tsx',
  'frontend/src/pages/engagement/tasks/TaskEdit.tsx',
  'frontend/src/pages/engagement/tasks/TaskList.tsx',
  'frontend/src/pages/engagement/followUps/FollowUpsPage.tsx',
  'frontend/src/pages/people/accounts/AccountCreate.tsx',
  'frontend/src/pages/people/accounts/AccountDetail.tsx',
  'frontend/src/pages/people/accounts/AccountEdit.tsx',
  'frontend/src/pages/people/accounts/AccountList.tsx',
  'frontend/src/pages/people/contacts/ContactCreate.tsx',
  'frontend/src/pages/people/contacts/ContactDetail.tsx',
  'frontend/src/pages/people/contacts/ContactEdit.tsx',
  'frontend/src/pages/people/contacts/ContactList.tsx',
  'frontend/src/pages/people/volunteers/AssignmentCreate.tsx',
  'frontend/src/pages/people/volunteers/AssignmentEdit.tsx',
  'frontend/src/pages/people/volunteers/VolunteerCreate.tsx',
  'frontend/src/pages/people/volunteers/VolunteerDetail.tsx',
  'frontend/src/pages/people/volunteers/VolunteerEdit.tsx',
  'frontend/src/pages/people/volunteers/VolunteerList.tsx',
  'frontend/src/pages/people/volunteers/VolunteerListEnhanced.tsx',
];

const violations = forbiddenLegacyPageFiles.filter((relPath) =>
  fs.existsSync(path.join(repoRoot, relPath))
);

const blockedLegacyRuntimeImports = [
  'pages/workflows/IntakeNew',
  'pages/public/PublicReportSnapshot',
  'pages/builder/siteAwareEditor',
  'pages/neo-brutalist/NeoBrutalistDashboard',
  'pages/neo-brutalist/LinkingModule',
  'pages/neo-brutalist/OperationsBoard',
  'pages/neo-brutalist/OutreachCenter',
  'pages/neo-brutalist/PeopleDirectory',
  'pages/neo-brutalist/ThemeAudit',
  'routes/authRouteComponents',
  'routes/peopleRouteComponents',
  'routes/peopleRoutePreload',
  'routes/workflowRouteComponents',
  'routes/builderRouteComponents',
  'routes/financeRouteComponents',
  'routes/adminRouteComponents',
  'routes/adminRedirectRouteComponents',
  'routes/analyticsRouteComponents',
  'routes/engagementRouteComponents',
  'routes/portalRouteComponents',
  'routes/websiteRouteComponents',
];

const blockedCompatibilityShimPrefixes = [
  'components/contactForm',
  'components/people',
  'hooks/useImportExport',
  'services/peopleImportExportApi',
];

const shouldScanRuntimeImportFile = (fullPath) => {
  if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) {
    return false;
  }

  const rel = path.relative(repoRoot, fullPath).split(path.sep).join('/');
  const base = path.basename(fullPath);

  if (rel.includes('/__tests__/') || /\.test\.[tj]sx?$/.test(base) || /\.spec\.[tj]sx?$/.test(base)) {
    return false;
  }

  if (rel.startsWith('frontend/src/pages/')) {
    return false;
  }

  return true;
};

const extractImportSpecifiers = (source) => {
  const specifiers = [];
  const importPattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;

  let match = importPattern.exec(source);
  while (match) {
    specifiers.push(match[1]);
    match = importPattern.exec(source);
  }

  return specifiers;
};

const normalizeImportSpecifier = (specifier, importerPath) => {
  if (specifier.startsWith('.')) {
    const resolvedPath = path.resolve(path.dirname(importerPath), specifier);
    return path.relative(frontendRoot, resolvedPath).split(path.sep).join('/');
  }

  return specifier.replace(/\\/g, '/');
};

const findBlockedImport = (specifier, importerPath) => {
  const normalized = normalizeImportSpecifier(specifier, importerPath);
  const exactBlockedImport = blockedLegacyRuntimeImports.find(
    (blockedImport) => normalized === blockedImport
  );

  if (exactBlockedImport) {
    return exactBlockedImport;
  }

  return blockedCompatibilityShimPrefixes.find(
    (blockedPrefix) =>
      normalized === blockedPrefix || normalized.startsWith(`${blockedPrefix}/`)
  );
};

const walkForRuntimeImports = (dir) => {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkForRuntimeImports(fullPath);
      continue;
    }

    if (!entry.isFile() || !shouldScanRuntimeImportFile(fullPath)) {
      continue;
    }

    const rel = path.relative(repoRoot, fullPath).split(path.sep).join('/');
    const source = fs.readFileSync(fullPath, 'utf8');
    const lines = source.split(/\r?\n/);
    const specifiers = extractImportSpecifiers(source);

    specifiers.forEach((specifier) => {
      const blockedImport = findBlockedImport(specifier, fullPath);
      if (!blockedImport) {
        return;
      }

      const lineIndex = lines.findIndex((line) => line.includes(specifier));
      violations.push(`${rel}:${lineIndex >= 0 ? lineIndex + 1 : 1}: ${blockedImport}`);
    });
  }
};

walkForRuntimeImports(frontendRoot);

if (violations.length > 0) {
  console.error(
    'Frontend legacy path policy violations found. Canonical implementations must stay under frontend/src/features/**, and runtime code must not import the remaining compatibility wrappers or root route facades.'
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Frontend legacy page path policy check passed for scoped migrated domains.');
