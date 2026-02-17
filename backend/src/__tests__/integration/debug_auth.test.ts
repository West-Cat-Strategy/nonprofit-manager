import request from 'supertest';
import app from '../../index';
import pool from '../../config/database';

describe('Auth Debugging', () => {
    const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    afterAll(async () => {
        await pool.end();
    });

    it('should register and return a valid token', async () => {
        const email = `debug-${unique()}@example.com`;
        console.log('Registering user:', email);

        const registerResponse = await request(app)
            .post('/api/auth/register')
            .send({
                email,
                password: 'Test123!Strong',
                password_confirm: 'Test123!Strong',
                first_name: 'Debug',
                last_name: 'User',
            });

        console.log('Register Status:', registerResponse.status);
        console.log('Register Body:', JSON.stringify(registerResponse.body, null, 2));

        const token = registerResponse.body.token;
        if (!token) {
            throw new Error('No token returned from registration');
        }

        const protectedResponse = await request(app)
            .get('/api/tasks')
            .set('Authorization', `Bearer ${token}`);

        console.log('Protected Route Status:', protectedResponse.status);
        if (protectedResponse.status !== 200) {
            console.log('Protected Route Body:', JSON.stringify(protectedResponse.body, null, 2));
        }
    });
});
