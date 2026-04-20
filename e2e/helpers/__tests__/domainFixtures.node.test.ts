import test from 'node:test';
import assert from 'node:assert/strict';
import type { Page } from '@playwright/test';
import {
  createRecoverableCaseFormAssignment,
  ensureCaseFormAssignmentReady,
  ensurePublicCaseFormTokenReady,
  retryFixtureApiRequest,
  resolveTestDatabaseConfig,
} from '../domainFixtures';

test('resolveTestDatabaseConfig prefers the Playwright E2E DB contract', () => {
  const originalEnv = {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    E2E_DB_HOST: process.env.E2E_DB_HOST,
    E2E_DB_PORT: process.env.E2E_DB_PORT,
    E2E_DB_NAME: process.env.E2E_DB_NAME,
  };

  process.env.DB_HOST = '127.0.0.9';
  process.env.DB_PORT = '9999';
  process.env.DB_NAME = 'wrong_db';
  process.env.E2E_DB_HOST = '127.0.0.1';
  process.env.E2E_DB_PORT = '8012';
  process.env.E2E_DB_NAME = 'nonprofit_manager_test';

  try {
    assert.deepEqual(resolveTestDatabaseConfig(), {
      host: '127.0.0.1',
      port: 8012,
      database: 'nonprofit_manager_test',
      user: 'postgres',
      password: 'postgres',
    });
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
});

test('ensurePublicCaseFormTokenReady retries transient 404 responses', async () => {
  const requestUrls: string[] = [];
  let attempts = 0;
  const page = {
    request: {
      get: async (url: string) => {
        requestUrls.push(url);
        attempts += 1;
        if (attempts < 3) {
          return {
            ok: () => false,
            status: () => 404,
            text: async () => 'not ready',
          };
        }

        return {
          ok: () => true,
          status: () => 200,
          text: async () => 'ok',
        };
      },
    },
  } as unknown as Page;

  const originalApiUrl = process.env.API_URL;
  process.env.API_URL = 'http://127.0.0.1:3001';

  try {
    await ensurePublicCaseFormTokenReady(page, 'fixture-token');
    assert.equal(attempts, 3);
    assert.deepEqual(requestUrls, [
      'http://127.0.0.1:3001/api/v2/public/case-forms/fixture-token',
      'http://127.0.0.1:3001/api/v2/public/case-forms/fixture-token',
      'http://127.0.0.1:3001/api/v2/public/case-forms/fixture-token',
    ]);
  } finally {
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
  }
});

test('ensureCaseFormAssignmentReady retries transient assignment-detail 404 responses', async () => {
  const detailUrls: string[] = [];
  let detailAttempts = 0;
  const page = {
    evaluate: async () => null,
    request: {
      get: async (url: string) => {
        if (url.endsWith('/api/v2/auth/csrf-token')) {
          return {
            ok: () => true,
            status: () => 200,
            text: async () => 'ok',
            json: async () => ({
              success: true,
              data: {
                csrfToken: 'csrf-token',
              },
            }),
          };
        }

        detailUrls.push(url);
        detailAttempts += 1;
        if (detailAttempts < 3) {
          return {
            ok: () => false,
            status: () => 404,
            text: async () => 'Form assignment not found',
            json: async () => ({}),
          };
        }

        return {
          ok: () => true,
          status: () => 200,
          text: async () => 'ok',
          json: async () => ({}),
        };
      },
    },
  } as unknown as Page;

  const originalApiUrl = process.env.API_URL;
  process.env.API_URL = 'http://127.0.0.1:3001';

  try {
    await ensureCaseFormAssignmentReady(page, 'fixture-token', 'case-1', 'assignment-1');
    assert.equal(detailAttempts, 3);
    assert.deepEqual(detailUrls, [
      'http://127.0.0.1:3001/api/v2/cases/case-1/forms/assignment-1',
      'http://127.0.0.1:3001/api/v2/cases/case-1/forms/assignment-1',
      'http://127.0.0.1:3001/api/v2/cases/case-1/forms/assignment-1',
    ]);
  } finally {
    if (originalApiUrl === undefined) {
      delete process.env.API_URL;
    } else {
      process.env.API_URL = originalApiUrl;
    }
  }
});

test('retryFixtureApiRequest retries transient 404 responses until success', async () => {
  let attempts = 0;

  const response = await retryFixtureApiRequest(
    'Failed to create public case-form assignment',
    async () => {
      attempts += 1;
      if (attempts < 3) {
        return {
          ok: () => false,
          status: () => 404,
          text: async () => 'not ready',
        };
      }

      return {
        ok: () => true,
        status: () => 201,
        text: async () => 'created',
      };
    }
  );

  assert.equal(attempts, 3);
  assert.equal(response.status(), 201);
});

test('createRecoverableCaseFormAssignment recovers from a false-negative 404 without retrying the write', async () => {
  let createAttempts = 0;
  let resolveAttempts = 0;

  const assignmentId = await createRecoverableCaseFormAssignment({
    executeCreateAssignment: async () => {
      createAttempts += 1;
      return {
        ok: () => false,
        status: () => 404,
        text: async () =>
          JSON.stringify({
            success: false,
            error: {
              code: 'not_found',
              message: 'Form assignment not found',
            },
          }),
      };
    },
    resolveAssignmentId: async () => {
      resolveAttempts += 1;
      return 'assignment-from-recovery';
    },
  });

  assert.equal(assignmentId, 'assignment-from-recovery');
  assert.equal(createAttempts, 1);
  assert.equal(resolveAttempts, 1);
});
