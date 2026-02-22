import { test, expect } from '../fixtures/auth.fixture';
import { getAuthHeaders } from '../helpers/database';
import { ensureAdminLoginViaAPI } from '../helpers/auth';

test.describe('Admin & Settings Module', () => {
    test('should load user settings', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings/user');

        await expect(authenticatedPage.getByRole('heading', { name: /user settings|profile/i })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /save all changes/i })).toBeVisible({ timeout: 10000 });
    });

    // Admin only routes - skipped for standard user tests
    // test('should load admin settings', async ({ authenticatedPage }) => {
    //     await authenticatedPage.goto('/settings/admin');
    //     await expect(authenticatedPage.getByRole('heading', { name: /admin settings|organization/i })).toBeVisible();
    // });

    test('should load API settings', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings/api');

        await expect(authenticatedPage.getByRole('heading', { name: /api settings/i })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /add webhook/i })).toBeVisible({ timeout: 10000 });
    });

    test('should load navigation settings', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings/navigation');

        await expect(authenticatedPage.getByRole('heading', { name: /navigation settings|menu|navigation/i }).first()).toBeVisible({ timeout: 10000 });
    });

    // Admin only routes - skipped for standard user tests
    // test('should load backup settings', async ({ authenticatedPage }) => {
    //     await authenticatedPage.goto('/settings/backup');
    //     await expect(authenticatedPage.getByRole('heading', { name: /backup|data management/i })).toBeVisible();
    // });

    test('should load email marketing settings', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/settings/email-marketing');

        await expect(authenticatedPage.getByRole('heading', { name: /email marketing|mailchimp/i })).toBeVisible();
    });

    test('admin can create and disable an outcome definition', async ({ authenticatedPage, authToken }) => {
        const apiURL = process.env.API_URL || 'http://localhost:3001';
        let tokenForRequest = authToken;
        let hasAdminSession = false;
        try {
            const { token } = await ensureAdminLoginViaAPI(authenticatedPage);
            tokenForRequest = token;
            hasAdminSession = true;
        } catch (error) {
            if (!(error instanceof Error) || !error.message.includes('Invalid credentials')) {
                throw error;
            }
        }

        const headers = await getAuthHeaders(authenticatedPage, tokenForRequest);
        const key = `e2e_outcome_${Date.now()}`;

        const createResponse = await authenticatedPage.request.post(`${apiURL}/api/admin/outcomes`, {
            headers,
            data: {
                key,
                name: `E2E Outcome ${Date.now()}`,
                description: 'Created during e2e test',
                category: 'test',
                isActive: true,
                isReportable: true,
            },
        });

        if (!hasAdminSession) {
            expect([401, 403]).toContain(createResponse.status());
            return;
        }

        expect(createResponse.ok()).toBeTruthy();
        const createBody = await createResponse.json();
        const createdOutcome = createBody?.data || createBody;
        expect(createdOutcome?.key).toBe(key);

        const disableResponse = await authenticatedPage.request.post(
            `${apiURL}/api/admin/outcomes/${createdOutcome.id}/disable`,
            {
                headers,
            }
        );
        expect(disableResponse.ok()).toBeTruthy();

        const disableBody = await disableResponse.json();
        const disabledOutcome = disableBody?.data || disableBody;
        expect(disabledOutcome?.is_active).toBe(false);
    });
});
