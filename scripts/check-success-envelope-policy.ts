#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');

const DIRECT_SUCCESS_REGEX = [
  /\bres\.json\s*\(/g,
  /\bres\.status\s*\(\s*20[0-9]\s*\)\s*\.json\s*\(/g,
];

const ENFORCED_CONTROLLERS = [
  'backend/src/controllers/caseController.ts',
  'backend/src/controllers/taskController.ts',
  'backend/src/controllers/userController.ts',
  'backend/src/controllers/mfaController.ts',
  'backend/src/controllers/portalAuthController.ts',
  'backend/src/controllers/paymentController.ts',
  'backend/src/controllers/publishingController.ts',
  'backend/src/controllers/templateController.ts',
];

const PROVIDER_ACK_EXCEPTIONS = new Set([
  // Provider webhook handlers must use sendProviderAck(...) and set skipSuccessEnvelope,
  // not direct 2xx res.json(...) responses.
  'backend/src/controllers/paymentController.ts',
  'backend/src/controllers/mailchimpController.ts',
]);

const violations = [];

const countDirectSuccessCalls = (source) =>
  DIRECT_SUCCESS_REGEX.reduce((total, pattern) => total + (source.match(pattern) || []).length, 0);

for (const file of ENFORCED_CONTROLLERS) {
  const fullPath = path.join(repoRoot, file);
  if (!fs.existsSync(fullPath)) {
    violations.push(`${file}: missing enforced controller file`);
    continue;
  }

  const source = fs.readFileSync(fullPath, 'utf8');
  const directCount = countDirectSuccessCalls(source);
  if (directCount > 0) {
    violations.push(`${file}: ${directCount} direct 2xx JSON response call(s)`);
  }
}

for (const file of PROVIDER_ACK_EXCEPTIONS) {
  const fullPath = path.join(repoRoot, file);
  if (!fs.existsSync(fullPath)) continue;
  const source = fs.readFileSync(fullPath, 'utf8');
  const usesProviderAck = /\bsendProviderAck\s*\(/.test(source);
  if (!usesProviderAck) {
    violations.push(`${file}: missing sendProviderAck(...) provider webhook ack usage`);
  }
}

if (violations.length > 0) {
  console.error(
    'Success envelope policy violations found. Enforced controllers must use sendSuccess()/created()/noContent(), and provider webhooks must use sendProviderAck(...).'
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Success envelope policy check passed (strict mode for enforced controllers + provider ack handlers).');
