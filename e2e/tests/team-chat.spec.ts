import { test, expect } from '../fixtures/auth.fixture';
import { expectCriticalSection, isTeamChatEnabled, waitForPageReady } from '../helpers/routeHelpers';

const TEAM_CHAT_ROUTE = '/team-chat';
test.skip(!isTeamChatEnabled(), 'Team chat is disabled in this environment');

test.describe('Team Chat', () => {
  test('team chat route requires authentication', async ({ page }) => {
    await page.goto(TEAM_CHAT_ROUTE, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  });

  test('loads team chat inbox and supports refresh action', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(TEAM_CHAT_ROUTE, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(authenticatedPage, {
      url: /\/team-chat(?:\?|$)/,
      selectors: [
        'h2:has-text("Case Chat Inbox")',
        'button:has-text("Refresh")',
      ],
      timeoutMs: 25000,
    });

    await expectCriticalSection(authenticatedPage, [
      'button:has-text("Refresh")',
      'h2:has-text("Case Chat Inbox")',
    ]);

    await expect(
      authenticatedPage.getByText(/Loading rooms...|No case chat rooms yet\./)
    ).toBeVisible({ timeout: 15000 });

    await authenticatedPage.getByRole('button', { name: 'Refresh' }).click();
    await expect(authenticatedPage.getByRole('button', { name: 'Refresh' })).toBeVisible();
  });
});
