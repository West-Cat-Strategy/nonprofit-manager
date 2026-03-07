#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const migrationsDir = path.join(repoRoot, 'database', 'migrations');
const manifestPath = path.join(migrationsDir, 'manifest.tsv');
const prismaMigrationsDir = path.join(repoRoot, 'backend', 'prisma', 'migrations');
const initdbPath = path.join(repoRoot, 'database', 'initdb', '000_init.sql');

const fail = (message) => {
  console.error(`Migration manifest policy failed: ${message}`);
  process.exit(1);
};

if (!fs.existsSync(manifestPath)) {
  fail(`missing manifest file: ${path.relative(repoRoot, manifestPath)}`);
}

const manifestLines = fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/);
const rows = [];
const knownNames = new Map();
const ids = new Set();
const canonicalFiles = new Set();

for (const [lineIndex, rawLine] of manifestLines.entries()) {
  const line = rawLine.trim();

  if (!line || line.startsWith('#')) {
    continue;
  }

  const parts = rawLine.split('\t');
  if (parts[0] === 'migration_id' && parts[1] === 'canonical_filename') {
    continue;
  }

  if (parts.length !== 3) {
    fail(`line ${lineIndex + 1} must contain exactly 3 tab-separated columns`);
  }

  const migrationId = parts[0].trim();
  const canonicalFilename = parts[1].trim();
  const aliases = parts[2]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!migrationId || !canonicalFilename) {
    fail(`line ${lineIndex + 1} is missing migration_id or canonical_filename`);
  }

  if (!canonicalFilename.startsWith(`${migrationId}_`) || !canonicalFilename.endsWith('.sql')) {
    fail(`canonical filename must start with "${migrationId}_" and end with ".sql": ${canonicalFilename}`);
  }

  if (ids.has(migrationId)) {
    fail(`duplicate migration id "${migrationId}"`);
  }
  ids.add(migrationId);

  if (knownNames.has(canonicalFilename)) {
    fail(`duplicate known filename "${canonicalFilename}"`);
  }
  knownNames.set(canonicalFilename, migrationId);
  canonicalFiles.add(canonicalFilename);

  const canonicalPath = path.join(migrationsDir, canonicalFilename);
  if (!fs.existsSync(canonicalPath)) {
    fail(`manifest canonical file does not exist: ${canonicalFilename}`);
  }

  for (const alias of aliases) {
    if (alias === canonicalFilename) {
      fail(`alias duplicates canonical filename for ${migrationId}: ${alias}`);
    }

    if (knownNames.has(alias)) {
      fail(`duplicate alias or canonical collision for "${alias}"`);
    }

    knownNames.set(alias, migrationId);
  }

  rows.push({ migrationId, canonicalFilename, aliases });
}

if (rows.length === 0) {
  fail('manifest contains no migrations');
}

const actualSqlFiles = fs
  .readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
  .map((entry) => entry.name)
  .sort();

for (const sqlFile of actualSqlFiles) {
  if (!canonicalFiles.has(sqlFile)) {
    fail(`SQL file is not declared as a canonical manifest entry: ${sqlFile}`);
  }
}

for (const canonicalFilename of canonicalFiles) {
  if (!actualSqlFiles.includes(canonicalFilename)) {
    fail(`manifest canonical file missing on disk: ${canonicalFilename}`);
  }
}

if (fs.existsSync(prismaMigrationsDir)) {
  const prismaSqlFiles = fs
    .readdirSync(prismaMigrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name);

  if (prismaSqlFiles.length > 0) {
    fail(
      `duplicate SQL migration surface detected under backend/prisma/migrations: ${prismaSqlFiles.join(', ')}`
    );
  }
}

if (!fs.existsSync(initdbPath)) {
  fail(`missing initdb script: ${path.relative(repoRoot, initdbPath)}`);
}

const initdbContents = fs.readFileSync(initdbPath, 'utf8');
const initdbIncludes = [...initdbContents.matchAll(/\\i\s+\/migrations\/([A-Za-z0-9_]+\.sql)/g)].map(
  (match) => match[1]
);

const expectedIncludes = rows.map((row) => row.canonicalFilename);
if (initdbIncludes.length !== expectedIncludes.length) {
  fail(
    `database/initdb/000_init.sql includes ${initdbIncludes.length} migration files; expected ${expectedIncludes.length}`
  );
}

for (let index = 0; index < expectedIncludes.length; index += 1) {
  if (initdbIncludes[index] !== expectedIncludes[index]) {
    fail(
      `database/initdb/000_init.sql include order mismatch at position ${index + 1}: expected ${expectedIncludes[index]}, found ${initdbIncludes[index]}`
    );
  }
}

console.log(
  `Migration manifest policy check passed. Validated ${rows.length} canonical migrations, ${knownNames.size} known filenames, and initdb parity.`
);
