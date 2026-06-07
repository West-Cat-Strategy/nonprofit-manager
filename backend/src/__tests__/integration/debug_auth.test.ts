import request from 'supertest';
import app from '../../index';
import {
    createIntegrationOrganization,
    deleteIntegrationAuthFixtures,
    grantIntegrationOrganizationAccess,
} from './helpers/authFixtures';

describe('Auth Debugging', () => {
    const unique = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    it('should register and return a valid token', async () => {
        const email = `debug-${unique()}@example.com`;

        const registerResponse = await request(app)
            .post('/api/v2/auth/register')
            .send({
                email,
                password: 'Test123!Strong',
                password_confirm: 'Test123!Strong',
                first_name: 'Debug',
                last_name: 'User',
            });

        expect(registerResponse.status).toBe(201);
        expect(registerResponse.body).toHaveProperty('token');

        const userId = registerResponse.body.user?.id || registerResponse.body.data?.user?.id;
        if (!userId) {
            throw new Error('No user returned from registration');
        }

        const organization = await createIntegrationOrganization({
            accountName: `Debug Auth Organization ${unique()}`,
            createdBy: userId,
        });
        await grantIntegrationOrganizationAccess({
            userId,
            organizationId: organization.id,
            role: 'user',
            grantedBy: userId,
        });

        const token = registerResponse.body.token;
        if (!token) {
            throw new Error('No token returned from registration');
        }

        try {
            const protectedResponse = await request(app)
                .get('/api/v2/tasks')
                .set('Authorization', `Bearer ${token}`)
                .set('X-Organization-Id', organization.id);

            expect(protectedResponse.status).toBe(200);
        } finally {
            await deleteIntegrationAuthFixtures({
                userIds: [userId],
                organizationIds: [organization.id],
            });
        }
    });
});
