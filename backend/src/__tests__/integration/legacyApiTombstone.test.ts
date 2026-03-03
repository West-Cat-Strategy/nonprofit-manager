import request from 'supertest';
import app from '../../index';

type EndpointCase = {
  method: 'get' | 'post';
  legacyPath: string;
  v2Path: string;
  body?: Record<string, unknown>;
};

const endpointCases: EndpointCase[] = [
  {
    method: 'post',
    legacyPath: '/api/auth/login',
    v2Path: '/api/v2/auth/login',
    body: {},
  },
  {
    method: 'get',
    legacyPath: '/api/users',
    v2Path: '/api/v2/users',
  },
  {
    method: 'get',
    legacyPath: '/api/cases',
    v2Path: '/api/v2/cases',
  },
  {
    method: 'get',
    legacyPath: '/api/payments/config',
    v2Path: '/api/v2/payments/config',
  },
  {
    method: 'get',
    legacyPath: '/api/public/reports/sample-token',
    v2Path: '/api/v2/public/reports/sample-token',
  },
  {
    method: 'post',
    legacyPath: '/api/portal/auth/login',
    v2Path: '/api/v2/portal/auth/login',
    body: {},
  },
  {
    method: 'get',
    legacyPath: '/api/portal/admin/requests',
    v2Path: '/api/v2/portal/admin/requests',
  },
];

const runRequest = async (endpoint: EndpointCase) => {
  if (endpoint.method === 'post') {
    return request(app).post(endpoint.legacyPath).send(endpoint.body ?? {});
  }

  return request(app).get(endpoint.legacyPath);
};

const runV2Request = async (endpoint: EndpointCase) => {
  if (endpoint.method === 'post') {
    return request(app).post(endpoint.v2Path).send(endpoint.body ?? {});
  }

  return request(app).get(endpoint.v2Path);
};

describe('Legacy API tombstone contract', () => {
  it.each(endpointCases)(
    'returns 410 tombstone response for $method $legacyPath',
    async (endpoint) => {
      const response = await runRequest(endpoint);

      expect(response.status).toBe(410);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error.code', 'legacy_api_removed');
      expect(response.body).toHaveProperty('error.details.legacyPath', endpoint.legacyPath);
      expect(response.body).toHaveProperty('error.details.migrationPath', endpoint.v2Path);
    }
  );

  it.each(endpointCases)(
    'does not tombstone v2 route for $method $v2Path',
    async (endpoint) => {
      const response = await runV2Request(endpoint);

      expect(response.status).not.toBe(410);
      if (response.body?.error?.code) {
        expect(response.body.error.code).not.toBe('legacy_api_removed');
      }
    }
  );
});
