#!/usr/bin/env node

const { URL } = require('url');

const DEFAULT_BASE_URL = 'http://127.0.0.1:8005';
const DEFAULT_API_URL = 'http://127.0.0.1:8004';

function parseArgs(argv) {
  const result = {};
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith('--')) {
      result[value.slice(2)] = next;
      index += 1;
    } else {
      result[value.slice(2)] = 'true';
    }
  }

  return result;
}

function joinUrl(base, targetPath) {
  return new URL(targetPath, base).toString();
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept: 'application/json, text/plain, */*',
      ...(options.headers || {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') || '';
  let body = null;
  if (contentType.includes('application/json')) {
    try {
      body = await response.json();
    } catch {
      body = null;
    }
  } else {
    body = await response.text();
  }

  return { response, body };
}

async function main() {
  const args = parseArgs(process.argv);
  const baseUrl = process.env.AUTH_TEST_BASE_URL || args['base-url'] || DEFAULT_BASE_URL;
  const apiUrl = process.env.AUTH_TEST_API_URL || args['api-url'] || DEFAULT_API_URL;
  const portalUrl = process.env.AUTH_TEST_PORTAL_URL || baseUrl;
  const email = process.env.AUTH_TEST_EMAIL || args.email || '';
  const password = process.env.AUTH_TEST_PASSWORD || args.password || '';
  const enableLogin = Boolean(email && password && (process.env.AUTH_TEST_LOGIN !== '0'));

  const checks = [
    { label: 'health-live', url: joinUrl(apiUrl, '/health/live'), expected: [200] },
    { label: 'setup-status', url: joinUrl(apiUrl, '/api/v2/auth/setup-status'), expected: [200] },
    { label: 'registration-status', url: joinUrl(apiUrl, '/api/v2/auth/registration-status'), expected: [200] },
    { label: 'login-page', url: joinUrl(baseUrl, '/login'), expected: [200] },
    { label: 'setup-page', url: joinUrl(baseUrl, '/setup'), expected: [200] },
    { label: 'portal-login', url: joinUrl(portalUrl, '/portal/login'), expected: [200] },
  ];

  const failures = [];

  for (const check of checks) {
    const { response } = await requestJson(check.url);
    if (!check.expected.includes(response.status)) {
      failures.push(`${check.label} returned ${response.status} (${check.url})`);
    } else {
      console.log(`PASS ${check.label} ${response.status} ${check.url}`);
    }
  }

  if (enableLogin) {
    const loginUrl = joinUrl(apiUrl, '/api/v2/auth/login');
    const { response, body } = await requestJson(loginUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      failures.push(
        `login POST failed with ${response.status} (${loginUrl})${body ? `: ${JSON.stringify(body)}` : ''}`
      );
    } else {
      console.log(`PASS login-post ${response.status} ${loginUrl}`);
    }
  } else {
    console.log('SKIP login-post (set AUTH_TEST_EMAIL and AUTH_TEST_PASSWORD to enable)');
  }

  if (failures.length > 0) {
    console.error('\nAuth flow check failed:\n');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('\nAuth flow check passed.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
