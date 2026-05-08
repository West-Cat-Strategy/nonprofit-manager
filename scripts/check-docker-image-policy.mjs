#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const digestPattern = /@sha256:[a-f0-9]{64}(?:$|[\s"'])/i;
const localImagePattern = /^nonprofit[-a-z0-9_.]*(?::[-a-z0-9_.]+)?$/i;

function usage() {
  console.error('Usage: node scripts/check-docker-image-policy.mjs [--files <path> ...]');
}

function defaultFiles() {
  const composeFiles = fs
    .readdirSync(repoRoot)
    .filter((name) => /^docker-compose\..+\.ya?ml$/.test(name) || /^docker-compose\.ya?ml$/.test(name))
    .map((name) => path.join(repoRoot, name));

  return [
    ...composeFiles,
    path.join(repoRoot, 'scripts/security-scan.sh'),
    path.join(repoRoot, 'scripts/docker-validate-overlays.sh'),
  ];
}

function parseArgs(argv) {
  if (argv.length === 0) {
    return defaultFiles();
  }

  if (argv[0] !== '--files' || argv.length === 1) {
    usage();
    process.exit(2);
  }

  return argv.slice(1).map((file) => path.resolve(repoRoot, file));
}

function isComposeFile(file) {
  return /\.ya?ml$/i.test(file);
}

function isDigestPinned(ref) {
  return digestPattern.test(ref);
}

function shellParameterDefaults(ref) {
  const defaults = [];
  const parameterPattern = /\$\{[A-Za-z_][A-Za-z0-9_]*(?::-([^}]+)|-([^}]+))\}/g;
  let match;

  while ((match = parameterPattern.exec(ref)) !== null) {
    defaults.push(match[1] ?? match[2]);
  }

  return defaults;
}

function validateImageRef(ref) {
  if (isDigestPinned(ref) || localImagePattern.test(ref)) {
    return [];
  }

  const defaults = shellParameterDefaults(ref);
  if (defaults.length > 0) {
    return defaults.flatMap((defaultRef) => validateImageRef(defaultRef));
  }

  if (
    /^\$[A-Za-z_][A-Za-z0-9_]*$/.test(ref) ||
    /^\$\{[A-Za-z_][A-Za-z0-9_]*(?::\?[^}]*)?\}$/.test(ref)
  ) {
    return [];
  }

  return [`External image must be digest-pinned or a local nonprofit-* build alias: ${ref}`];
}

function collectComposeImages(file) {
  const source = fs.readFileSync(file, 'utf8');
  const document = parseDocument(source, { prettyErrors: false });

  if (document.errors.length > 0) {
    throw new Error(`Unable to parse ${path.relative(repoRoot, file)}: ${document.errors[0].message}`);
  }

  const parsed = document.toJSON();
  const services = parsed?.services ?? {};

  return Object.entries(services)
    .filter(([, service]) => service && typeof service.image === 'string')
    .map(([serviceName, service]) => ({
      ref: service.image,
      source: `${path.relative(repoRoot, file)} service ${serviceName}`,
    }));
}

function collectShellImageDefaults(file) {
  const source = fs.readFileSync(file, 'utf8');
  const entries = [];
  const assignmentPattern = /^\s*(?:local\s+)?([A-Z0-9_]*DOCKER_IMAGE)=["']?([^"'\n]+)["']?/gm;
  let match;

  while ((match = assignmentPattern.exec(source)) !== null) {
    entries.push({
      ref: match[2],
      source: `${path.relative(repoRoot, file)} ${match[1]}`,
    });
  }

  for (const dockerRunImage of collectDockerRunImages(source)) {
    entries.push({
      ref: dockerRunImage,
      source: `${path.relative(repoRoot, file)} docker run`,
    });
  }

  return entries;
}

function shellTokens(command) {
  const tokens = [];
  const tokenPattern = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let match;

  while ((match = tokenPattern.exec(command)) !== null) {
    tokens.push(match[1] ?? match[2] ?? match[3]);
  }

  return tokens;
}

function collectDockerRunImages(source) {
  const normalized = source.replace(/\\\n/g, ' ');
  const images = [];
  const dockerRunPattern = /(?:^|[;&|]\s*)docker\s+run\s+([^;&\n]+)/gm;
  let match;

  while ((match = dockerRunPattern.exec(normalized)) !== null) {
    const tokens = shellTokens(match[1]);

    for (let index = 0; index < tokens.length; index += 1) {
      const token = tokens[index];

      if (token === '--') {
        continue;
      }

      if (token.startsWith('-')) {
        if (
          [
            '-e',
            '--env',
            '--env-file',
            '-v',
            '--volume',
            '-w',
            '--workdir',
            '--name',
            '--network',
            '-p',
            '--publish',
            '--user',
            '-u',
          ].includes(token)
        ) {
          index += 1;
        }

        continue;
      }

      images.push(token);
      break;
    }
  }

  return images;
}

const files = parseArgs(process.argv.slice(2));
const entries = files.flatMap((file) => {
  if (!fs.existsSync(file)) {
    throw new Error(`Image policy target does not exist: ${path.relative(repoRoot, file)}`);
  }

  return isComposeFile(file) ? collectComposeImages(file) : collectShellImageDefaults(file);
});

const issues = entries.flatMap((entry) =>
  validateImageRef(entry.ref).map((message) => `${entry.source}: ${message}`)
);

if (issues.length > 0) {
  console.error('Docker image policy failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Docker image policy passed for ${entries.length} image reference(s).`);
