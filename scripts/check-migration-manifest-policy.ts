#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const {
  repoRoot,
  readText,
} = require('./lib/policy-utils.ts');

function parseManifestRows(manifestText) {
  return manifestText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [migrationId, canonicalFilename, legacyAliases = ''] = line.split('\t');
      return { migrationId, canonicalFilename, legacyAliases };
    });
}

function migrationNumericId(filename) {
  return filename.match(/^([0-9]+)_/)?.[1] || null;
}

function findDuplicateValues(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

function analyzeMigrationManifestPolicy(root = repoRoot) {
  const manifestPath = path.join(root, 'database/migrations/manifest.tsv');
  const initdbPath = path.join(root, 'database/initdb/000_init.sql');
  const migrationsDir = path.join(root, 'database/migrations');

  const manifestRows = parseManifestRows(readText(manifestPath));
  const initdbText = readText(initdbPath);
  const migrationFiles = fs
    .readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith('.sql'))
    .sort();
  const includeFiles = [...initdbText.matchAll(/^\\i \/migrations\/([^\s]+)$/gm)].map(
    (match) => match[1]
  );
  const tuplePattern = /\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/g;
  const insertSectionStart = initdbText.indexOf(
    'INSERT INTO schema_migrations (filename, migration_id, canonical_filename)'
  );
  const onConflictIndex = initdbText.indexOf(
    'ON CONFLICT (filename) DO UPDATE',
    insertSectionStart
  );
  const insertSection =
    insertSectionStart === -1 || onConflictIndex === -1
      ? ''
      : initdbText.slice(insertSectionStart, onConflictIndex);
  const insertTuples = [...insertSection.matchAll(tuplePattern)].map((match) => ({
    filename: match[1],
    migrationId: match[2],
    canonicalFilename: match[3],
  }));
  const updatePattern =
    /UPDATE schema_migrations\s+SET migration_id = '([^']+)',\s+canonical_filename = '([^']+)'\s+WHERE filename = '([^']+)';/gms;
  const updates = [...initdbText.matchAll(updatePattern)].map((match) => ({
    migrationId: match[1],
    canonicalFilename: match[2],
    filename: match[3],
  }));

  const issues = [];

  if (includeFiles.length !== manifestRows.length) {
    issues.push(
      `Initdb migration include count ${includeFiles.length} does not match manifest row count ${manifestRows.length}.`
    );
  }

  const manifestCanonicalFiles = manifestRows.map((row) => row.canonicalFilename);
  if (
    manifestCanonicalFiles.length !== includeFiles.length ||
    manifestCanonicalFiles.some((filename, index) => filename !== includeFiles[index])
  ) {
    issues.push('Initdb migration include order does not match database/migrations/manifest.tsv.');
  }

  const duplicateManifestIds = findDuplicateValues(manifestRows.map((row) => row.migrationId));
  for (const migrationId of duplicateManifestIds) {
    issues.push(`Duplicate migration ID in manifest.tsv: ${migrationId}.`);
  }

  const duplicateNumericIds = findDuplicateValues(
    migrationFiles.map((filename) => migrationNumericId(filename)).filter(Boolean)
  );
  for (const migrationId of duplicateNumericIds) {
    const matchingFiles = migrationFiles.filter(
      (filename) => migrationNumericId(filename) === migrationId
    );
    issues.push(`Duplicate numeric migration file ID ${migrationId}: ${matchingFiles.join(', ')}.`);
  }

  const knownMigrationFiles = new Set(manifestCanonicalFiles);
  for (const row of manifestRows) {
    for (const alias of row.legacyAliases.split(/\s+/).filter(Boolean)) {
      knownMigrationFiles.add(alias);
    }
  }

  const orphanMigrationFiles = migrationFiles.filter((filename) => !knownMigrationFiles.has(filename));
  for (const filename of orphanMigrationFiles) {
    issues.push(`Orphan migration file is not listed in manifest.tsv: ${filename}.`);
  }

  if (
    insertTuples.length !== manifestRows.length ||
    insertTuples.some((tuple, index) => {
      const row = manifestRows[index];
      return (
        tuple.filename !== row.canonicalFilename ||
        tuple.migrationId !== row.migrationId ||
        tuple.canonicalFilename !== row.canonicalFilename
      );
    })
  ) {
    issues.push('schema_migrations INSERT tuples do not match the manifest canonical filenames or IDs.');
  }

  const expectedAliasUpdates = manifestRows
    .filter((row) => row.legacyAliases)
    .map((row) => ({
      migrationId: row.migrationId,
      canonicalFilename: row.canonicalFilename,
      filename: row.legacyAliases.split(/\s+/)[0],
    }));

  if (expectedAliasUpdates.length !== updates.length) {
    issues.push(
      `Expected ${expectedAliasUpdates.length} schema_migrations alias updates, found ${updates.length}.`
    );
  }

  for (const expected of expectedAliasUpdates) {
    const actual = updates.find((entry) => entry.filename === expected.filename);
    if (!actual) {
      issues.push(`Missing schema_migrations alias update for ${expected.filename}.`);
      continue;
    }

    if (
      actual.migrationId !== expected.migrationId ||
      actual.canonicalFilename !== expected.canonicalFilename
    ) {
      issues.push(
        `Alias update for ${expected.filename} does not match manifest entry ${expected.canonicalFilename}.`
      );
    }
  }

  return issues;
}

function runMigrationManifestPolicyCheck(root = repoRoot) {
  const issues = analyzeMigrationManifestPolicy(root);

  if (issues.length > 0) {
    console.error('Migration manifest policy check failed:\n');
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log('Migration manifest policy check passed.');
}

if (require.main === module) {
  runMigrationManifestPolicyCheck();
}

module.exports = {
  analyzeMigrationManifestPolicy,
  parseManifestRows,
};
