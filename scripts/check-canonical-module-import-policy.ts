#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..');
const backendRoot = path.join(repoRoot, 'backend/src');

const blockedImports = [
  '@services/publishingService',
  '@services/publishing/publicSiteRuntimeService',
  '@services/reconciliationService',
  '@services/portalAppointmentSlotService',
  '@services/appointmentReminderService',
  '@services/portalMessagingService',
  '@controllers/publishingController',
  '@controllers/reconciliationController',
  '@controllers/portalAdminController',
];

const scopedModuleImportRules = [
  {
    prefix: 'backend/src/modules/activities/',
    allowSubpaths: ['/services/'],
    blockedImports: [
      '@services/activityService',
      '@services/domains/engagement',
    ],
  },
  {
    prefix: 'backend/src/modules/webhooks/',
    allowSubpaths: ['/services/'],
    blockedImports: [
      '@services/apiKeyService',
      '@services/webhookService',
      '@services/domains/integration',
    ],
  },
  {
    prefix: 'backend/src/modules/mailchimp/',
    allowSubpaths: ['/services/'],
    blockedImports: [
      '@services/mailchimpService',
      '@services/domains/integration',
    ],
  },
  {
    prefix: 'backend/src/modules/invitations/',
    allowSubpaths: ['/services/'],
    blockedImports: [
      '@services/invitationService',
      '@services/userRoleService',
      '@services/emailSettingsService',
      '@services/emailService',
      '@services/domains/integration',
    ],
  },
  {
    prefix: 'backend/src/modules/meetings/',
    allowSubpaths: ['/services/'],
    blockedImports: [
      '@services/meetingService',
      '@services/domains/engagement',
    ],
  },
];

const shouldScan = (fullPath) => {
  if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.tsx')) {
    return false;
  }

  const rel = path.relative(repoRoot, fullPath).split(path.sep).join('/');
  const base = path.basename(fullPath);

  if (rel.includes('/__tests__/') || /\.test\.[tj]sx?$/.test(base) || /\.spec\.[tj]sx?$/.test(base)) {
    return false;
  }

  return true;
};

const violations = [];

const walk = (dir) => {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    if (!entry.isFile() || !shouldScan(fullPath)) {
      continue;
    }

    const rel = path.relative(repoRoot, fullPath).split(path.sep).join('/');
    const source = fs.readFileSync(fullPath, 'utf8');
    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      blockedImports.forEach((blockedImport) => {
        if (line.includes(`'${blockedImport}'`) || line.includes(`"${blockedImport}"`)) {
          violations.push(`${rel}:${index + 1}: ${blockedImport}`);
        }
      });

      scopedModuleImportRules.forEach((rule) => {
        if (!rel.startsWith(rule.prefix)) {
          return;
        }

        if (rule.allowSubpaths.some((subpath) => rel.includes(subpath))) {
          return;
        }

        rule.blockedImports.forEach((blockedImport) => {
          if (line.includes(`'${blockedImport}'`) || line.includes(`"${blockedImport}"`)) {
            violations.push(`${rel}:${index + 1}: ${blockedImport}`);
          }
        });
      });
    });
  }
};

walk(backendRoot);

if (violations.length > 0) {
  console.error(
    'Canonical module import policy violations found. Use module-owned paths instead of legacy controller/service shims.'
  );
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Canonical module import policy check passed.');
