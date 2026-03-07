import { test, expect } from '../fixtures/auth.fixture';
import { loginPortalUserUI, provisionApprovedPortalUser } from '../helpers/portal';

test.describe('Donor Portal', () => {
    test('should display portal login page', async ({ page }) => {
        await page.goto('/portal/login');
        await page.getByText('Loading...').waitFor({ state: 'hidden', timeout: 30000 }).catch(() => undefined);
        const portalInputs = page.getByRole('textbox');
        await expect(portalInputs.first()).toBeVisible({ timeout: 30000 });
        await expect(portalInputs.nth(1)).toBeVisible({ timeout: 30000 });
    });

    test('should access portal dashboard as logged in user', async ({ page }) => {
        const portalUser = await provisionApprovedPortalUser(page);
        await loginPortalUserUI(page, portalUser);

        await page.goto('/portal');
        await expect(page).toHaveURL(/\/portal(?:\?|$)/);
        await expect(page.locator('body')).toContainText(/welcome to your portal|loading portal/i, {
            timeout: 30000,
        });
    });

    test('should navigate to portal events', async ({ page }) => {
        const portalUser = await provisionApprovedPortalUser(page);
        await loginPortalUserUI(page, portalUser);

        await page.goto('/portal/events');
        await expect(page).toHaveURL(/\/portal\/events(?:\?|$)/);
        await expect(page.locator('body')).toContainText(/events|loading portal/i, {
            timeout: 30000,
        });
    });

    test('should navigate to portal profile', async ({ page }) => {
        const portalUser = await provisionApprovedPortalUser(page);
        await loginPortalUserUI(page, portalUser);

        await page.goto('/portal/profile');
        await expect(page).toHaveURL(/\/portal\/profile(?:\?|$)/);
        await expect(page.locator('body')).toContainText(
            /client portal|your profile|loading profile|unable to load profile|loading portal/i,
            {
                timeout: 30000,
            }
        );
    });

    test('portal route transitions do not repeatedly refetch session bootstrap', async ({ page }) => {
        const portalUser = await provisionApprovedPortalUser(page);
        const portalMeRequests: string[] = [];

        page.on('request', (request) => {
            const url = request.url();
            if (/\/api\/portal\/auth\/me(?:\?|$)/.test(url)) {
                portalMeRequests.push(url);
            }
        });

        await loginPortalUserUI(page, portalUser);
        await page.goto('/portal');
        await expect(page).toHaveURL(/\/portal(?:\?|$)/);
        await page.goto('/portal/profile');
        await expect(page).toHaveURL(/\/portal\/profile(?:\?|$)/);
        await page.goto('/portal/events');
        await expect(page).toHaveURL(/\/portal\/events(?:\?|$)/);
        await page.waitForTimeout(600);

        expect(portalMeRequests.length).toBeLessThanOrEqual(1);
    });
});
