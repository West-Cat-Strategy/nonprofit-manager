#!/usr/bin/env node

const path = require('path');
const {
  repoRoot,
  relativeToRepo,
  readText,
} = require('./lib/policy-utils.ts');

const routeIndexPath = path.join(repoRoot, 'backend/src/routes/v2/index.ts');
const publicApiPolicyPath = path.join(repoRoot, 'backend/src/config/publicApiPolicy.ts');
const indexPath = path.join(repoRoot, 'backend/src/index.ts');
const csrfPath = path.join(repoRoot, 'backend/src/middleware/csrf.ts');

const MODULE_LOCAL_AUTH_MOUNT_PATHS = new Set([
  '/activities',
  '/admin',
  '/backup',
  '/communications',
  '/dashboard',
  '/export',
  '/ingest',
  '/invitations',
  '/mailchimp',
  '/payments',
  '/plausible',
  '/portal',
  '/portal/admin',
  '/sites',
  '/social-media',
  '/templates',
  '/users',
  '/webhooks',
]);

function lineNumberForIndex(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function collectExportedStringArray(text, exportName) {
  const match = new RegExp(`export const ${exportName} = \\[([\\s\\S]*?)\\] as const;`).exec(text);
  if (!match) {
    return null;
  }

  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
}

function collectRouteMounts(text) {
  const mountPattern = /\b(mountV2Routes|mountWorkspaceModuleRoutes)\(\s*(['"])([^'"]+)\2([\s\S]*?)\);/g;
  const mounts = [];

  for (const match of text.matchAll(mountPattern)) {
    const callName = match[1];
    const mountPath = match[3];
    const rest = match[4] || '';
    mounts.push({
      callName,
      path: mountPath,
      line: lineNumberForIndex(text, match.index),
      registrarAuthenticated:
        callName === 'mountWorkspaceModuleRoutes' || /\bauthenticate\s*:\s*true\b/.test(rest),
    });
  }

  return mounts;
}

function analyzeV2RouteAuthPosture(input) {
  const routeText = input.routeText;
  const publicApiPolicyText = input.publicApiPolicyText;
  const indexText = input.indexText || '';
  const csrfText = input.csrfText || '';
  const routeFile = input.routeFile || routeIndexPath;
  const issues = [];

  const publicMountPaths = collectExportedStringArray(
    publicApiPolicyText,
    'PUBLIC_API_V2_MOUNT_PATHS'
  );
  const publicSiteMountPaths = collectExportedStringArray(
    publicApiPolicyText,
    'PUBLIC_SITE_API_V2_MOUNT_PATHS'
  );

  if (!publicMountPaths) {
    issues.push(`${relativeToRepo(publicApiPolicyPath)}: missing PUBLIC_API_V2_MOUNT_PATHS`);
  }
  if (!publicSiteMountPaths) {
    issues.push(`${relativeToRepo(publicApiPolicyPath)}: missing PUBLIC_SITE_API_V2_MOUNT_PATHS`);
  }

  const publicMountSet = new Set(publicMountPaths || []);
  const publicSiteMountSet = new Set(publicSiteMountPaths || []);
  const mounts = collectRouteMounts(routeText);
  const mountedPathSet = new Set();

  for (const mount of mounts) {
    if (mountedPathSet.has(mount.path)) {
      issues.push(`${relativeToRepo(routeFile)}:${mount.line} duplicates mount ${mount.path}`);
    }
    mountedPathSet.add(mount.path);

    if (mount.callName === 'mountWorkspaceModuleRoutes' && publicMountSet.has(mount.path)) {
      issues.push(
        `${relativeToRepo(routeFile)}:${mount.line} mounts public path ${mount.path} as workspace-protected`
      );
    }

    if (mount.callName === 'mountV2Routes') {
      if (mount.path.startsWith('/public/') && !publicMountSet.has(mount.path)) {
        issues.push(
          `${relativeToRepo(routeFile)}:${mount.line} mounts public ingress ${mount.path} outside PUBLIC_API_V2_MOUNT_PATHS`
        );
      }

      if (!mount.registrarAuthenticated) {
        const isPublic = publicMountSet.has(mount.path);
        const isModuleLocal = MODULE_LOCAL_AUTH_MOUNT_PATHS.has(mount.path);
        if (!isPublic && !isModuleLocal) {
          issues.push(
            `${relativeToRepo(routeFile)}:${mount.line} mounts ${mount.path} without registrar auth or explicit module-local/public posture`
          );
        }
      }
    }
  }

  for (const publicPath of publicMountSet) {
    if (!mountedPathSet.has(publicPath)) {
      issues.push(
        `${relativeToRepo(routeFile)}: PUBLIC_API_V2_MOUNT_PATHS includes unmounted ${publicPath}`
      );
    }
  }

  for (const publicSitePath of publicSiteMountSet) {
    if (!publicMountSet.has(publicSitePath)) {
      issues.push(
        `${relativeToRepo(publicApiPolicyPath)}: PUBLIC_SITE_API_V2_MOUNT_PATHS includes ${publicSitePath} outside PUBLIC_API_V2_MOUNT_PATHS`
      );
    }
    if (!publicSitePath.startsWith('/public/')) {
      issues.push(
        `${relativeToRepo(publicApiPolicyPath)}: PUBLIC_SITE_API_V2_MOUNT_PATHS entry ${publicSitePath} must start with /public/`
      );
    }
  }

  if (indexText && !indexText.includes('isPublicSiteApiPath')) {
    issues.push(`${relativeToRepo(indexPath)}: public-site CORS must use isPublicSiteApiPath`);
  }

  if (csrfText && !csrfText.includes('isCsrfSkipPath')) {
    issues.push(`${relativeToRepo(csrfPath)}: CSRF skip policy must use isCsrfSkipPath`);
  }

  return {
    issues,
    mounts,
    publicMountPaths: publicMountPaths || [],
    publicSiteMountPaths: publicSiteMountPaths || [],
  };
}

function main() {
  const result = analyzeV2RouteAuthPosture({
    routeText: readText(routeIndexPath),
    publicApiPolicyText: readText(publicApiPolicyPath),
    indexText: readText(indexPath),
    csrfText: readText(csrfPath),
    routeFile: routeIndexPath,
  });

  if (result.issues.length > 0) {
    console.error('V2 route auth posture policy check failed:\n');
    for (const issue of result.issues) {
      console.error(`- ${issue}`);
    }
    process.exit(1);
  }

  console.log(
    `V2 route auth posture policy check passed (${result.publicMountPaths.length} public mounts, ${result.publicSiteMountPaths.length} public-site ingress mounts).`
  );
}

if (require.main === module) {
  main();
}

module.exports = {
  MODULE_LOCAL_AUTH_MOUNT_PATHS,
  analyzeV2RouteAuthPosture,
  collectExportedStringArray,
  collectRouteMounts,
};
