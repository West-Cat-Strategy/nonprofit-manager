import request from 'supertest';
import type { Express } from 'express';

export interface TestAuthContext {
  token: string;
  userId: string;
  email: string;
}

const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export async function registerTestUser(app: Express, prefix = 'itest'): Promise<TestAuthContext> {
  const email = `${unique(prefix)}@example.com`;
  const password = 'StrongPassword123!';

  const response = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password,
      password_confirm: password,
      first_name: 'Integration',
      last_name: 'Tester',
    })
    .expect(201);

  return {
    token: response.body.token,
    userId: response.body.user.id,
    email,
  };
}

export const withAuth = (token: string) => ({ Authorization: `Bearer ${token}` });
