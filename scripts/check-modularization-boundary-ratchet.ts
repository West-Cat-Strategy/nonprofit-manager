#!/usr/bin/env node

const path = require('path');
const {
  countMatches,
  failIfIssues,
  readBaselineJson,
  readText,
  repoRoot,
  walkFiles,
} = require('./lib/policy-utils.ts');

const baselinePath = 'scripts/baselines/modularization-boundaries.json';
const baseline = readBaselineJson(baselinePath);

if (!baseline || !baseline.metrics || typeof baseline.metrics !== 'object') {
  console.error(`Modularization boundary baseline is missing or invalid: ${baselinePath}`);
  process.exit(1);
}

function capFor(metricName) {
  const metric = baseline.metrics[metricName];
  if (!metric || typeof metric.cap !== 'number') {
    console.error(`Modularization boundary baseline is missing numeric cap for ${metricName}`);
    process.exit(1);
  }
  return metric.cap;
}

function countPatternInFiles(files, pattern) {
  return files.reduce((total, filePath) => total + countMatches(readText(filePath), pattern), 0);
}

const backendModuleFiles = walkFiles(path.join(repoRoot, 'backend/src/modules'), {
  extensions: ['.ts'],
  includeTests: false,
});

const frontendFeatureFiles = walkFiles(path.join(repoRoot, 'frontend/src/features'), {
  extensions: ['.ts', '.tsx'],
  includeTests: false,
});

const backendControllerFiles = walkFiles(path.join(repoRoot, 'backend/src/modules'), {
  extensions: ['.ts'],
  includeTests: false,
  filter: (filePath) => filePath.includes(`${path.sep}controllers${path.sep}`),
});

const e2eFiles = walkFiles(path.join(repoRoot, 'e2e'), {
  extensions: ['.ts', '.tsx'],
});
const e2eNonTestSupportFiles = e2eFiles.filter(
  (filePath) => !filePath.includes(`${path.sep}e2e${path.sep}helpers${path.sep}testSupport${path.sep}`)
);

const metrics = {
  backendModuleImportsFromRootServices: countPatternInFiles(
    backendModuleFiles,
    /\b(?:import|export)\b[\s\S]*?\bfrom\s+['"]@services\/|require\(\s*['"]@services\//g
  ),
  backendRootServiceFiles: walkFiles(path.join(repoRoot, 'backend/src/services'), {
    extensions: ['.ts'],
  }).length,
  frontendFeatureImportsFromSharedServices: countPatternInFiles(
    frontendFeatureFiles,
    /\b(?:import|export)\b[\s\S]*?\bfrom\s+['"](?:\.\.\/){2,}services(?:\/[^'"]*)?['"]|require\(\s*['"](?:\.\.\/){2,}services(?:\/[^'"]*)?['"]/g
  ),
  backendControllerSqlCalls: backendControllerFiles.reduce(
    (total, filePath) => total + countMatches(readText(filePath), /\.query\(/g),
    0
  ),
  e2eDirectAppSourceImports: countPatternInFiles(
    e2eFiles,
    /\b(?:import|export)\b[\s\S]*?\bfrom\s+['"][^'"]*(?:backend|frontend)\/src|require\(\s*['"][^'"]*(?:backend|frontend)\/src/g
  ),
  e2eDirectAppSourceImportsOutsideTestSupport: countPatternInFiles(
    e2eNonTestSupportFiles,
    /\b(?:import|export)\b[\s\S]*?\bfrom\s+['"][^'"]*(?:backend|frontend)\/src|require\(\s*['"][^'"]*(?:backend|frontend)\/src/g
  ),
};

const issues = [];

for (const [metricName, current] of Object.entries(metrics)) {
  const cap = capFor(metricName);
  if (current > cap) {
    issues.push(`${metricName}: ${current} exceeds baseline cap ${cap}`);
  }
}

failIfIssues(
  'Modularization boundary ratchet failed:',
  issues,
  `Modularization boundary ratchet passed (${Object.entries(metrics)
    .map(([name, value]) => `${name}=${value}/${capFor(name)}`)
    .join(', ')}).`
);
