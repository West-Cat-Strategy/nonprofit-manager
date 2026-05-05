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
const {
  analyzeMigrationManifestPolicy,
} = require('../check-migration-manifest-policy.ts');
const {
  analyzeOpenApiContract,
} = require('../check-openapi-contract.ts');

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

function writeMigrationPolicyFixture(root, { manifestRows, migrationFiles, includeFiles, tuples }) {
  const migrationsDir = path.join(root, 'database/migrations');
  const initdbDir = path.join(root, 'database/initdb');
  fs.mkdirSync(migrationsDir, { recursive: true });
  fs.mkdirSync(initdbDir, { recursive: true });

  fs.writeFileSync(
    path.join(migrationsDir, 'manifest.tsv'),
    `${manifestRows.join('\n')}\n`,
    'utf8'
  );

  for (const filename of migrationFiles) {
    fs.writeFileSync(path.join(migrationsDir, filename), '-- fixture migration\n', 'utf8');
  }

  const includeSql = includeFiles.map((filename) => `\\i /migrations/${filename}`).join('\n');
  const tupleSql = tuples
    .map(
      ({ filename, migrationId, canonicalFilename }) =>
        `    ('${filename}', '${migrationId}', '${canonicalFilename}')`
    )
    .join(',\n');

  fs.writeFileSync(
    path.join(initdbDir, '000_init.sql'),
    `${includeSql}

INSERT INTO schema_migrations (filename, migration_id, canonical_filename)
VALUES
${tupleSql}
ON CONFLICT (filename) DO UPDATE
SET migration_id = EXCLUDED.migration_id,
    canonical_filename = EXCLUDED.canonical_filename;
`,
    'utf8'
  );
}

function writeOpenApiFixture(root, text) {
  const apiDir = path.join(root, 'docs/api');
  fs.mkdirSync(apiDir, { recursive: true });
  fs.writeFileSync(path.join(apiDir, 'openapi.yaml'), text, 'utf8');
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

test('migration manifest policy flags orphan migration files and duplicate numeric IDs', () => {
  const fixtureRoot = createTempDir();
  writeMigrationPolicyFixture(fixtureRoot, {
    manifestRows: ['001\t001_initial_schema.sql'],
    migrationFiles: ['001_initial_schema.sql', '001_orphan_duplicate.sql'],
    includeFiles: ['001_initial_schema.sql'],
    tuples: [
      {
        filename: '001_initial_schema.sql',
        migrationId: '001',
        canonicalFilename: '001_initial_schema.sql',
      },
    ],
  });

  const issues = analyzeMigrationManifestPolicy(fixtureRoot);

  assert(
    issues.some((issue) =>
      issue.includes('Orphan migration file is not listed in manifest.tsv: 001_orphan_duplicate.sql')
    )
  );
  assert(
    issues.some((issue) =>
      issue.includes('Duplicate numeric migration file ID 001: 001_initial_schema.sql, 001_orphan_duplicate.sql')
    )
  );
});

test('migration manifest policy accepts non-numeric suffix IDs when manifest and initdb match', () => {
  const fixtureRoot = createTempDir();
  writeMigrationPolicyFixture(fixtureRoot, {
    manifestRows: [
      '060a\t060a_event_checkin_and_appointment_reminders.sql\t060_event_checkin_and_appointment_reminders.sql',
      '060b\t060b_saved_reports_sharing_columns.sql\t060_saved_reports_sharing_columns.sql',
    ],
    migrationFiles: [
      '060a_event_checkin_and_appointment_reminders.sql',
      '060b_saved_reports_sharing_columns.sql',
    ],
    includeFiles: [
      '060a_event_checkin_and_appointment_reminders.sql',
      '060b_saved_reports_sharing_columns.sql',
    ],
    tuples: [
      {
        filename: '060a_event_checkin_and_appointment_reminders.sql',
        migrationId: '060a',
        canonicalFilename: '060a_event_checkin_and_appointment_reminders.sql',
      },
      {
        filename: '060b_saved_reports_sharing_columns.sql',
        migrationId: '060b',
        canonicalFilename: '060b_saved_reports_sharing_columns.sql',
      },
    ],
  });

  fs.appendFileSync(
    path.join(fixtureRoot, 'database/initdb/000_init.sql'),
    `
UPDATE schema_migrations
SET migration_id = '060a',
    canonical_filename = '060a_event_checkin_and_appointment_reminders.sql'
WHERE filename = '060_event_checkin_and_appointment_reminders.sql';

UPDATE schema_migrations
SET migration_id = '060b',
    canonical_filename = '060b_saved_reports_sharing_columns.sql'
WHERE filename = '060_saved_reports_sharing_columns.sql';
`,
    'utf8'
  );

  assert.deepEqual(analyzeMigrationManifestPolicy(fixtureRoot), []);
});

test('openapi contract policy accepts local refs and path parameters', () => {
  const fixtureRoot = createTempDir();
  writeOpenApiFixture(
    fixtureRoot,
    `
openapi: 3.0.3
info:
  title: Fixture API
  version: 1.0.0
servers:
  - url: /api/v2
paths:
  /people/{personId}:
    get:
      summary: Get person
      parameters:
        - in: path
          name: personId
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Person
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SuccessEnvelope'
components:
  schemas:
    SuccessEnvelope:
      type: object
      required: [success]
      properties:
        success:
          type: boolean
`
  );

  assert.deepEqual(analyzeOpenApiContract(fixtureRoot), []);
});

test('openapi contract policy flags missing refs and unbound path params', () => {
  const fixtureRoot = createTempDir();
  writeOpenApiFixture(
    fixtureRoot,
    `
openapi: 3.0.3
info:
  title: Fixture API
  version: 1.0.0
servers:
  - url: /api/v2
paths:
  /api/v2/people/{personId}:
    get:
      responses:
        '20x':
          description: Person
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/MissingEnvelope'
`
  );

  const issues = analyzeOpenApiContract(fixtureRoot);

  assert(issues.some((issue) => issue.includes('should be relative to the /api/v2 server base URL')));
  assert(issues.some((issue) => issue.includes('must include a summary')));
  assert(issues.some((issue) => issue.includes("missing path parameter 'personId'")));
  assert(issues.some((issue) => issue.includes('must be an HTTP status code or default')));
  assert(issues.some((issue) => issue.includes("references missing component '#/components/schemas/MissingEnvelope'")));
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
  assert.equal(env.PW_REUSE_EXISTING_SERVER, '0');
  assert.equal(env.E2E_PORT_ACTION, 'kill');
  assert.equal(env.E2E_READY_URLS, undefined);
  assert.equal(env.SKIP_WEBSERVER, '0');
});

test('e2e playwright host wrapper enables readiness preflight only for explicit server reuse', () => {
  const result = run(
    'bash',
    ['scripts/e2e-playwright.sh', 'host', '--direct', 'env'],
    {
      PW_REUSE_EXISTING_SERVER: '1',
      E2E_BACKEND_PORT: '4301',
      E2E_FRONTEND_PORT: '5301',
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const env = parseEnvironment(result.stdout);
  assert.equal(env.PW_REUSE_EXISTING_SERVER, '1');
  assert.equal(env.E2E_PORT_ACTION, 'warn');
  assert.equal(
    env.E2E_READY_URLS,
    'http://127.0.0.1:4301/health/live http://127.0.0.1:5301'
  );
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

test('e2e host ci report wrapper resolves default archived report paths in dry-run mode', () => {
  const result = run('bash', ['scripts/e2e-host-ci-report.sh', '--dry-run']);

  assert.equal(result.status, 0, result.stderr);

  const env = parseEnvironment(result.stdout);
  assert.match(
    env.REPORT_ROOT,
    new RegExp(`^${repoRoot.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}/tmp/e2e-reports$`)
  );
  assert.match(env.RUN_ID, /^host-ci-\d{8}T\d{6}Z-\d+$/);
  assert.equal(env.RUN_DIR, `${env.REPORT_ROOT}/${env.RUN_ID}`);
  assert.equal(env.PLAYWRIGHT_HTML_OUTPUT_DIR, `${env.RUN_DIR}/playwright-report`);
  assert.equal(env.PLAYWRIGHT_JSON_OUTPUT_FILE, `${env.RUN_DIR}/test-results.json`);
  assert.equal(env.SLICE_DESKTOP_HTML, `${env.RUN_DIR}/desktop/playwright-report`);
  assert.equal(env.SLICE_DESKTOP_JSON, `${env.RUN_DIR}/desktop/test-results.json`);
  assert.equal(env.SLICE_MOBILE_HTML, `${env.RUN_DIR}/mobile/playwright-report`);
  assert.equal(env.SLICE_MOBILE_JSON, `${env.RUN_DIR}/mobile/test-results.json`);
});

test('e2e host ci report wrapper honors report root and run id overrides in dry-run mode', () => {
  const tempDir = createTempDir();
  const reportRoot = path.join(tempDir, 'archived-reports');
  const runId = 'host-ci-custom-run';

  const result = run(
    'bash',
    ['scripts/e2e-host-ci-report.sh', '--dry-run'],
    {
      E2E_REPORT_ROOT: reportRoot,
      E2E_REPORT_RUN_ID: runId,
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const env = parseEnvironment(result.stdout);
  assert.equal(env.REPORT_ROOT, reportRoot);
  assert.equal(env.RUN_ID, runId);
  assert.equal(env.RUN_DIR, `${reportRoot}/${runId}`);
  assert.equal(env.SHOW_REPORT_LOG, `${reportRoot}/${runId}/show-report.log`);
  assert.equal(
    env.OPEN_REPORT_COMMAND,
    `${repoRoot}/node_modules/.bin/playwright show-report ${reportRoot}/${runId}/playwright-report`
  );
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

test('legacy broad verifier defaults to current supported contract notice', () => {
  const result = run('bash', ['scripts/verify.sh']);

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /historical verifier re-homed/);
  assert.match(result.stdout, /make test-tooling/);
  assert.match(result.stdout, /scripts\/select-checks\.sh --mode fast/);
  assert.match(result.stdout, /make ci-full/);
  assert.doesNotMatch(result.stdout, /legacy verification replay complete/);
});

test('legacy PR verifier defaults to current supported contract notice', () => {
  const result = run('bash', ['scripts/verify-pr.sh', '9']);

  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stdout, /historical PR verifier re-homed/);
  assert.match(result.stdout, /make test-tooling/);
  assert.match(result.stdout, /scripts\/select-checks\.sh --mode fast/);
  assert.match(result.stdout, /make ci-full/);
  assert.match(result.stdout, /scripts\/verify-pr\.sh --run-legacy 9/);
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

test('select-checks broadens docs-only strict mode into the coverage gate', () => {
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
    'make test-coverage-full',
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

test('select-checks treats Playwright config as tooling plus behavior in fast mode', () => {
  const result = run('bash', [
    'scripts/select-checks.sh',
    '--files',
    'e2e/playwright.config.ts',
    '--mode',
    'fast',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [
    'make test-tooling',
    'cd e2e && npm run test:smoke',
    'make test-e2e-docker-smoke',
  ]);
});

test('select-checks broadens orchestration changes into the coverage gate in strict mode', () => {
  const result = run('bash', [
    'scripts/select-checks.sh',
    '--files',
    'Makefile scripts/ci.sh scripts/select-checks.sh',
    '--mode',
    'strict',
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split('\n'), [
    'make test-tooling',
    'make lint',
    'make typecheck',
    'make test-coverage-full',
  ]);
});

test('select-checks includes untracked files in default selection', () => {
  const fixturePath = path.join(repoRoot, 'openapi.selector-fixture');

  try {
    fs.writeFileSync(fixturePath, 'fixture\n', 'utf8');

    const result = run('bash', ['scripts/select-checks.sh', '--base', 'HEAD', '--mode', 'fast']);

    assert.equal(result.status, 0, result.stderr);
    assert(result.stdout.split('\n').includes('make lint-openapi'));
  } finally {
    fs.rmSync(fixturePath, { force: true });
  }
});

test('select-checks includes dirty tracked files in default selection', () => {
  const fixturePath = path.join(repoRoot, 'knip.json');
  const originalText = fs.readFileSync(fixturePath, 'utf8');

  try {
    fs.writeFileSync(fixturePath, `${originalText}\n`, 'utf8');

    const result = run('bash', ['scripts/select-checks.sh', '--base', 'HEAD', '--mode', 'fast']);

    assert.equal(result.status, 0, result.stderr);
    assert(result.stdout.split('\n').includes('npm run knip'));
  } finally {
    fs.writeFileSync(fixturePath, originalText, 'utf8');
  }
});

test('gitignore keeps live envs local-only while allowing tracked templates and canonical refs', () => {
  const result = run('bash', [
    '-lc',
    `git check-ignore -v --no-index --non-matching --stdin <<'EOF'
.env.development
.env.example
output/playwright/session/trace.zip
.codex/skills/nonprofit-manager-persona-analysis/references/source-map.md
.codex/skills/nonprofit-manager-security-ops/SKILL.md
EOF`,
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\.gitignore:\d+:\.env\.\*\t\.env\.development/);
  assert.match(result.stdout, /\.gitignore:\d+:!\.env\.example\t\.env\.example/);
  assert.match(result.stdout, /\.gitignore:\d+:output\/playwright\/\toutput\/playwright\/session\/trace\.zip/);
  assert.match(
    result.stdout,
    /\.gitignore:\d+:!\.codex\/skills\/nonprofit-manager-persona-analysis\/references\/\*\*\t\.codex\/skills\/nonprofit-manager-persona-analysis\/references\/source-map\.md/
  );
  assert.match(
    result.stdout,
    /\.gitignore:\d+:\/?\.codex\/skills\/\*\t\.codex\/skills\/nonprofit-manager-security-ops\/SKILL\.md/
  );
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

test('archive export requires explicit risk confirmation for remote targets', () => {
  const tempDir = createTempDir();
  const archiveFile = path.join(tempDir, 'example.dump');

  const result = run('bash', ['scripts/db-export-archive.sh', archiveFile], {
    DB_HOST: 'db.example.test',
    DB_PORT: '5432',
    DB_NAME: 'nonprofit_manager',
  });

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /Set DB_EXPORT_RISK_CONFIRM=export:db\.example\.test:5432\/nonprofit_manager/
  );
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

test('verify compatibility wrapper prints selector-backed commands without running them', () => {
  const result = run('bash', [
    'scripts/verify.sh',
    '--mode',
    'fast',
    '--files',
    'scripts/verify.sh docs/verification/VERIFICATION_SYSTEM.md',
    '--print-only',
  ]);

  assert.equal(result.status, 0, result.stderr);

  const commands = result.stdout.trim().split('\n').filter(Boolean);
  assert.deepEqual(commands, [
    'make check-links',
    'make test-tooling',
    'make test-e2e-docker-smoke',
  ]);
});

test('PR verification compatibility wrapper delegates gh file lists to selector', () => {
  const tempDir = createTempDir();
  const fakeGhPath = path.join(tempDir, 'gh');
  fs.writeFileSync(
    fakeGhPath,
    [
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      'if [[ "$1" == "pr" && "$2" == "diff" && "$3" == "123" && "$4" == "--name-only" ]]; then',
      '  printf "%s\\n" "e2e/tests/public-browser-proof.spec.ts" "scripts/verify-pr.sh"',
      '  exit 0',
      'fi',
      'echo "unexpected gh invocation: $*" >&2',
      'exit 1',
      '',
    ].join('\n')
  );
  fs.chmodSync(fakeGhPath, 0o755);

  const result = run(
    'bash',
    ['scripts/verify-pr.sh', '123', '--mode', 'fast', '--print-only'],
    {
      PATH: `${tempDir}${path.delimiter}${process.env.PATH || ''}`,
    }
  );

  assert.equal(result.status, 0, result.stderr);

  const commands = result.stdout.trim().split('\n').filter(Boolean);
  assert.deepEqual(commands, [
    'make test-tooling',
    'cd e2e && npm run test:smoke',
    'make test-e2e-docker-smoke',
  ]);
});
