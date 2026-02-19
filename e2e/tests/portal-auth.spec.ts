import { test, expect } from '../fixtures/auth.fixture';

test.describe('Portal Auth Workflows', () => {
  test('portal login and signup pages validate required fields', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/portal/login');
    await expect(authenticatedPage.getByRole('heading', { name: /portal/i })).toBeVisible();

    await authenticatedPage.goto('/portal/signup');
    await expect(authenticatedPage.getByRole('heading', { name: /request portal access/i })).toBeVisible();
    const submit = authenticatedPage
      .getByRole('button', { name: /submit request|sign up|create|register/i })
      .first();
    await submit.click();
    const email = authenticatedPage.locator('input[type="email"]').first();
    await expect(email).toHaveJSProperty('validity.valid', false);
  });
});
