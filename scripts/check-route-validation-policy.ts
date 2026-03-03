#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const routesDir = path.join(repoRoot, 'backend/src/routes');
const modulesDir = path.join(repoRoot, 'backend/src/modules');

const ROUTE_CALL_REGEX = /router\.(get|post|put|patch|delete)\s*\(([^;]*?)\);/gs;

const explicitRequirements = [
  {
    file: 'backend/src/modules/admin/routes/index.ts',
    method: 'put',
    routePath: '/email-settings',
    middleware: 'validateBody',
  },
  {
    file: 'backend/src/modules/admin/routes/index.ts',
    method: 'put',
    routePath: '/twilio-settings',
    middleware: 'validateBody',
  },
  {
    file: 'backend/src/modules/admin/routes/index.ts',
    method: 'put',
    routePath: '/registration-settings',
    middleware: 'validateBody',
  },
  {
    file: 'backend/src/modules/admin/routes/index.ts',
    method: 'get',
    routePath: '/audit-logs',
    middleware: 'validateQuery',
  },
  {
    file: 'backend/src/modules/admin/routes/index.ts',
    method: 'get',
    routePath: '/pending-registrations',
    middleware: 'validateQuery',
  },
  {
    file: 'backend/src/modules/admin/routes/index.ts',
    method: 'post',
    routePath: '/pending-registrations/:id/approve',
    middleware: 'validateParams',
  },
  {
    file: 'backend/src/modules/admin/routes/index.ts',
    method: 'post',
    routePath: '/pending-registrations/:id/reject',
    middleware: 'validateParams',
  },
  {
    file: 'backend/src/modules/reports/routes/index.ts',
    method: 'get',
    routePath: '/templates',
    middleware: 'validateQuery',
  },
  {
    file: 'backend/src/modules/reports/routes/index.ts',
    method: 'get',
    routePath: '/templates/:id',
    middleware: 'validateParams',
  },
  {
    file: 'backend/src/modules/reports/routes/index.ts',
    method: 'post',
    routePath: '/templates/:id/instantiate',
    middleware: 'validateParams',
  },
  {
    file: 'backend/src/modules/reports/routes/index.ts',
    method: 'delete',
    routePath: '/templates/:id',
    middleware: 'validateParams',
  },
  {
    file: 'backend/src/modules/savedReports/routes/index.ts',
    method: 'get',
    routePath: '/',
    middleware: 'validateQuery',
  },
  {
    file: 'backend/src/modules/users/routes/index.ts',
    method: 'get',
    routePath: '/',
    middleware: 'validateQuery',
  },
  {
    file: 'backend/src/modules/portalAdmin/routes/index.ts',
    method: 'get',
    routePath: '/users',
    middleware: 'validateQuery',
  },
  {
    file: 'backend/src/modules/portalAdmin/routes/index.ts',
    method: 'get',
    routePath: '/users/:id/activity',
    middleware: 'validateQuery',
  },
  {
    file: 'backend/src/modules/auth/routes/index.ts',
    method: 'patch',
    routePath: '/preferences/:key',
    middleware: 'validateParams',
  },
  {
    file: 'backend/src/modules/auth/routes/index.ts',
    method: 'get',
    routePath: '/reset-password/:token',
    middleware: 'validateParams',
  },
  {
    file: 'backend/src/modules/auth/routes/index.ts',
    method: 'delete',
    routePath: '/passkeys/:id',
    middleware: 'validateParams',
  },
];

const readTypeScriptFiles = (dir, relPrefix) => {
  const files = [];

  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      files.push(...readTypeScriptFiles(path.join(dir, entry.name), `${relPrefix}/${entry.name}`));
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;

    const absPath = path.join(dir, entry.name);
    files.push({
      relPath: `${relPrefix}/${entry.name}`,
      absPath,
      source: fs.readFileSync(absPath, 'utf8'),
    });
  }

  return files;
};

const legacyRouteFiles = readTypeScriptFiles(routesDir, 'backend/src/routes');
const moduleRouteFiles = readTypeScriptFiles(modulesDir, 'backend/src/modules').filter((file) =>
  file.relPath.includes('/routes/')
);
const routeFiles = [...legacyRouteFiles, ...moduleRouteFiles];

const violations = [];

for (const file of routeFiles) {
  let match;
  while ((match = ROUTE_CALL_REGEX.exec(file.source)) !== null) {
    const [, method, routeCall] = match;
    const pathMatch = routeCall.match(/["'`]([^"'`]+)["'`]/);
    if (!pathMatch) continue;

    const routePath = pathMatch[1];

    if (routePath.includes(':') && !/validateParams\s*\(/.test(routeCall)) {
      violations.push(
        `${file.relPath}: ${method.toUpperCase()} ${routePath} is missing validateParams(...)`
      );
    }
  }
}

for (const requirement of explicitRequirements) {
  const fullPath = path.join(repoRoot, requirement.file);
  if (!fs.existsSync(fullPath)) {
    violations.push(`${requirement.file}: file missing for explicit policy check`);
    continue;
  }

  const source = fs.readFileSync(fullPath, 'utf8');
  const escapedRoutePath = requirement.routePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const routePattern =
    'router\\.' +
    requirement.method +
    '\\s*\\(([^;]*?["\\\']' +
    escapedRoutePath +
    '["\\\'][^;]*?)\\);';
  const routeRegex = new RegExp(routePattern, 'gs');
  const routeMatch = routeRegex.exec(source);

  if (!routeMatch) {
    violations.push(
      `${requirement.file}: could not find ${requirement.method.toUpperCase()} ${requirement.routePath}`
    );
    continue;
  }

  if (!new RegExp(`${requirement.middleware}\\s*\\(`).test(routeMatch[1])) {
    violations.push(
      `${requirement.file}: ${requirement.method.toUpperCase()} ${requirement.routePath} is missing ${requirement.middleware}(...)`
    );
  }
}

if (violations.length > 0) {
  console.error('Route validation policy violations found.');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Route validation policy check passed.');
