#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { buildAudit } = require('./query-contract-audit-lib');

const repoRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(repoRoot, 'scripts/policies/query-contract-audit-baseline.json');

const strictZeroControllers = new Set([
  'backend/src/controllers/userController.ts',
  'backend/src/controllers/adminStatsController.ts',
  'backend/src/controllers/registrationSettingsController.ts',
  'backend/src/controllers/reportTemplateController.ts',
  'backend/src/controllers/portalAdminController.ts',
  'backend/src/modules/accounts/controllers/accounts.controller.ts',
  'backend/src/modules/tasks/controllers/tasks.controller.ts',
  'backend/src/modules/events/controllers/events.controller.ts',
  'backend/src/modules/cases/controllers/catalog.controller.ts',
]);

if (!fs.existsSync(baselinePath)) {
  console.error(`Missing query contract baseline: ${path.relative(repoRoot, baselinePath)}`);
  process.exit(1);
}

const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const current = buildAudit(repoRoot);
const violations = [];

if (current.totals.missingValidateQuery > Number(baseline.totals?.missingValidateQuery || 0)) {
  violations.push(
    `MISSING_VALIDATE_QUERY increased: ${current.totals.missingValidateQuery} > ${baseline.totals?.missingValidateQuery || 0}`
  );
}

if (current.totals.nonStrictQuerySchema > Number(baseline.totals?.nonStrictQuerySchema || 0)) {
  violations.push(
    `NON_STRICT_QUERY_SCHEMA increased: ${current.totals.nonStrictQuerySchema} > ${baseline.totals?.nonStrictQuerySchema || 0}`
  );
}

if (current.totals.directReqQuery > Number(baseline.totals?.directReqQuery || 0)) {
  violations.push(
    `DIRECT_REQ_QUERY increased: ${current.totals.directReqQuery} > ${baseline.totals?.directReqQuery || 0}`
  );
}

const baselineDirectReqByRoute = new Set(
  (baseline.directReqQuery || []).map((item) => `${item.file}|${item.method}|${item.routePath}`)
);

for (const item of current.directReqQuery || []) {
  const routeKey = `${item.file}|${item.method}|${item.routePath}`;
  if (!baselineDirectReqByRoute.has(routeKey) && item.handler) {
    violations.push(
      `New DIRECT_REQ_QUERY route: ${item.file} ${item.method} ${item.routePath} (${item.handler})`
    );
  }
}

const endpointsByRoute = new Map(
  (current.endpoints || []).map((item) => [`${item.file}|${item.method}|${item.routePath}`, item])
);

for (const routeKey of baselineDirectReqByRoute) {
  const endpoint = endpointsByRoute.get(routeKey);
  if (!endpoint) continue;
  if (!endpoint.handler) continue;

  const functionName = endpoint.handler.split('.').pop();
  const controllerCandidates = (current.endpoints || []).filter(
    (candidate) => candidate.handler && candidate.handler.split('.').pop() === functionName
  );
  for (const candidate of controllerCandidates) {
    if (
      candidate.controllerUsesReqQuery &&
      !candidate.controllerUsesValidatedQuery &&
      strictZeroControllers.has(candidate.file)
    ) {
      violations.push(
        `Strict-zero controller still uses direct req.query without validatedQuery: ${candidate.file} (${candidate.handler})`
      );
    }
  }
}

if (violations.length > 0) {
  console.error('Query contract policy violations found.');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Query contract policy check passed.');
