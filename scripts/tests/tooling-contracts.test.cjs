const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  catalogPatternMatchesRuntime,
  canonicalizeRoutePattern,
  collectRouteCatalogTargetsFromSource,
  collectRouteRegistrationTargetsFromSource,
  collectRuntimeRouteTargetsFromSource,
} = require('../lib/route-audit.ts');
const {
  analyzeRouteValidationSource,
} = require('../check-route-validation-policy.ts');

const repoRoot = path.resolve(__dirname, '../..');

function run(command, args, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...extraEnv,
    },
    encoding: 'utf8',
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function parseEnvironment(stdout) {
  return Object.fromEntries(
    stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      })
  );
}

function createTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'nonprofit-manager-tooling-'));
}

test('route audit collects catalog entries across split files', () => {
  const catalogFileA = collectRouteCatalogTargetsFromSource(
    '/repo/frontend/src/routes/routeCatalog/staffPeople.ts',
    `
      export const staffPeopleRoute = {
        path: '/staff/people',
      };
    `
  );
  const catalogFileB = collectRouteCatalogTargetsFromSource(
    '/repo/frontend/src/routes/routeCatalog/staffPersonDetails.ts',
    `
      export const staffPersonDetailsRoute = {
        path: \`/staff/people/\${personId}\`,
      };
    `
  );

  assert.deepEqual(
    [...new Set([...catalogFileA, ...catalogFileB].map((entry) => entry.pattern))].sort(),
    ['/staff/people', '/staff/people/:*']
  );
});

test('route audit normalizes runtime template literals to catalog patterns', () => {
  const runtimeTargets = collectRuntimeRouteTargetsFromSource(
    '/repo/frontend/src/features/people/PersonCard.tsx',
    `
      navigate(\`/staff/people/\${personId}\`);
      history.push({ pathname: \`/staff/people/\${personId}/notes\` });
      if (location.pathname === \`/staff/people/\${personId}\`) {
        return null;
      }
      return <Link to={\`/staff/people/\${personId}\`}>Open</Link>;
    `
  );

  assert.deepEqual(
    runtimeTargets.map((entry) => entry.pattern),
    [
      '/staff/people/:*',
      '/staff/people/:*/notes',
      '/staff/people/:*',
      '/staff/people/:*',
    ]
  );
});

test('route audit normalizes registered template routes to canonical patterns', () => {
  const registrationTargets = collectRouteRegistrationTargetsFromSource(
    '/repo/frontend/src/routes/StaffRoutes.tsx',
    `
      export const routes = [
        { path: '/staff/people' },
        { path: '/staff/people/:personId' },
      ];

      export function StaffRoutes() {
        return <Route path={\`/staff/people/\${personId}/notes\`} element={<div />} />;
      }
    `
  );

  assert.deepEqual(
    registrationTargets.map((entry) => entry.pattern),
    ['/staff/people', '/staff/people/:*', '/staff/people/:*/notes']
  );
});

test('route validation flags only the unvalidated parameterized routes in mixed files', () => {
  const result = analyzeRouteValidationSource(
    '/repo/backend/src/modules/people/routes/index.ts',
    `
      router.get('/api/v2/people/:personId', validateParams(personIdSchema), getPerson);
      router.get('/api/v2/people/:personId/notes/:noteId', getPersonNote);
    `
  );

  assert.equal(result.routeDefinitionCount, 2);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0], /without params validation middleware/);
});

test('route validation reports route files that define routes without any validation middleware', () => {
  const result = analyzeRouteValidationSource(
    '/repo/backend/src/modules/reports/routes/index.ts',
    `
      router.get('/api/v2/reports', listReports);
      router.post('/api/v2/reports', createReport);
    `
  );

  assert.equal(result.routeDefinitionCount, 2);
  assert.equal(result.issues.length, 1);
  assert.match(result.issues[0], /defines routes without any recognized validation middleware/);
});

test('canonicalizeRoutePattern collapses params and template placeholders consistently', () => {
  assert.equal(canonicalizeRoutePattern('/staff/people/:personId'), '/staff/people/:*');
  assert.equal(canonicalizeRoutePattern('/staff/people/${personId}'), '/staff/people/:*');
  assert.equal(canonicalizeRoutePattern('/staff/people/${personId}/notes/:noteId'), '/staff/people/:*/notes/:*');
});

test('route pattern matching accepts prefix checks and compatible dynamic runtime patterns', () => {
  assert.equal(
    catalogPatternMatchesRuntime('/demo', '/demo/dashboard', 'pathname-startsWith'),
    true
  );
  assert.equal(
    catalogPatternMatchesRuntime('/portal/reset-password', '/portal/reset-password/:*', 'pathname-startsWith'),
    true
  );
  assert.equal(
    catalogPatternMatchesRuntime('/websites/:*/:*', '/websites/:*/overview', 'to'),
    true
  );
  assert.equal(
    catalogPatternMatchesRuntime('/websites/:*/:*', '/website-builder/:*/preview', 'to'),
    false
  );
});

test('e2e playwright host wrapper preserves explicit runtime overrides', () => {
  const result = run(
    'bash',
    ['scripts/e2e-playwright.sh', 'host', '--direct', 'env'],
    {
      E2E_BACKEND_PORT: '4301',
      E2E_FRONTEND_PORT: '5301',
      BASE_URL: 'http://127.0.0.1:5301',
      API_URL: 'http://127.0.0.1:4301',
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const env = parseEnvironment(result.stdout);
  assert.equal(env.E2E_BACKEND_PORT, '4301');
  assert.equal(env.E2E_FRONTEND_PORT, '5301');
  assert.equal(env.BASE_URL, 'http://127.0.0.1:5301');
  assert.equal(env.API_URL, 'http://127.0.0.1:4301');
  assert.equal(env.E2E_REQUIRED_PORTS, '4301 5301');
  assert.equal(
    env.E2E_READY_URLS,
    'http://127.0.0.1:4301/health/live http://127.0.0.1:5301'
  );
  assert.equal(env.SKIP_WEBSERVER, '0');
});

test('e2e playwright docker wrapper carries ports and readiness URLs through the E2E contract', () => {
  const result = run(
    'bash',
    ['scripts/e2e-playwright.sh', 'docker', '--direct', 'env'],
    {
      E2E_BACKEND_PORT: '8104',
      E2E_FRONTEND_PORT: '8105',
      E2E_PUBLIC_SITE_PORT: '8106',
      E2E_DB_PORT: '9102',
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const env = parseEnvironment(result.stdout);
  assert.equal(env.DB_PORT, '9102');
  assert.equal(env.E2E_DB_PORT, '9102');
  assert.equal(env.E2E_REQUIRED_PORTS, '8104 8105 8106');
  assert.equal(
    env.E2E_READY_URLS,
    'http://127.0.0.1:8104/health/ready http://127.0.0.1:8105 http://127.0.0.1:8106/health/ready'
  );
  assert.equal(env.SKIP_WEBSERVER, '1');
});

test('e2e port preflight fails clearly when lsof is unavailable', () => {
  const result = run(
    'bash',
    ['-c', 'source scripts/lib/common.sh && e2e_collect_listener_pids 65535'],
    {
      PATH: '/usr/bin:/bin',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /requires 'lsof'/);
});

test('select-checks keeps docs-only fast mode on docs validation', () => {
  const result = run('bash', [
    'scripts/select-checks.sh',
    '--files',
    'docs/testing/TESTING.md scripts/README.md',
    '--mode',
    'fast',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), ['make check-links']);
});

test('select-checks broadens docs-only strict mode into a runtime smoke check', () => {
  const result = run('bash', [
    'scripts/select-checks.sh',
    '--files',
    'docs/testing/TESTING.md scripts/README.md',
    '--mode',
    'strict',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [
    'make check-links',
    'make test-e2e-docker-smoke',
  ]);
});

test('select-checks recommends tooling regression coverage for orchestration changes', () => {
  const result = run('bash', [
    'scripts/select-checks.sh',
    '--files',
    'Makefile docker-compose.dev.yml scripts/install-git-hooks.sh scripts/select-checks.sh',
    '--mode',
    'fast',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [
    'make test-tooling',
    './scripts/install-git-hooks.sh --dry-run',
    'make test-e2e-docker-smoke',
    'make db-verify',
  ]);
});

test('docker build helper keeps workspace dependency validation explicit', () => {
  const result = run('bash', ['scripts/docker-build-images.sh', 'validate', '--dry-run']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [
    'docker build --build-context workspace=. --pull --no-cache --target workspace-deps -f backend/Dockerfile backend',
    'docker build --build-context workspace=. --pull --no-cache --target workspace-production-deps -f backend/Dockerfile backend',
    'docker build --build-context workspace=. --pull --no-cache -f backend/Dockerfile backend',
    'docker build --build-context workspace=. --pull --no-cache --target workspace-deps -f frontend/Dockerfile frontend',
    'docker build --build-context workspace=. --pull --no-cache -f frontend/Dockerfile frontend',
  ]);
});

test('deploy staging fails closed when the staging env file is missing', () => {
  const tempDir = createTempDir();
  const missingEnvFile = path.join(tempDir, '.env.staging');
  const result = run(
    'bash',
    ['scripts/deploy.sh', 'staging'],
    {
      DEPLOY_STAGING_ENV_FILE: missingEnvFile,
      DEPLOY_EXECUTE: '0',
    }
  );

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /Env file not found/);
});

test('archive restore requires explicit confirmation before destructive work', () => {
  const tempDir = createTempDir();
  const archiveFile = path.join(tempDir, 'example.dump');
  fs.writeFileSync(archiveFile, 'placeholder');

  const result = run('bash', ['scripts/db-restore-archive.sh', archiveFile], {
    DB_RESTORE_CONFIRM: '0',
  });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /Set DB_RESTORE_CONFIRM=1/);
});

test('db-at-rest validation can load required production values from an env file', () => {
  const tempDir = createTempDir();
  const envFile = path.join(tempDir, 'db-at-rest.env');

  fs.writeFileSync(
    envFile,
    [
      'DB_AT_REST_ENCRYPTION_MODE=luks',
      'DB_HOST=postgres',
      'POSTGRES_DATA_DIR=/var/lib/nonprofit-manager/postgres',
      'DB_LUKS_MAPPING_NAME=nonprofit-manager-db',
      'BACKUP_DIR=/var/lib/nonprofit-manager/backups/database',
    ].join('\n')
  );

  const result = run('bash', [
    '-c',
    'source scripts/lib/db-at-rest.sh && load_env_file_defaults "$1" && NODE_ENV=production validate_production_db_at_rest_contract',
    '_',
    envFile,
  ]);

  assert.equal(result.status, 0, result.stderr);
});
