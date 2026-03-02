import request from 'supertest';
import app from '../../index';

describe('Auth Debugging', () => {
    const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    it('should register and return a valid token', async () => {
        const email = `debug-${unique()}@example.com`;

        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email,
                password: 'Test123!Strong',
                password_confirm: 'Test123!Strong',
                first_name: 'Debug',
                last_name: 'User',
            });

        expect(registerResponse.status).toBe(201);
        expect(registerResponse.body).toHaveProperty('token');

        const token = registerResponse.body.token;
        if (!token) {
            throw new Error('No token returned from registration');
        }

        const protectedResponse = await request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${token}`);

        expect(protectedResponse.status).toBe(200);
    });
});
