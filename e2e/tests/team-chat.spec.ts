import { test, expect } from '../fixtures/auth.fixture';
import { expectCriticalSection, isTeamChatEnabled, waitForPageReady } from '../helpers/routeHelpers';

const TEAM_CHAT_ROUTE = '/team-chat';
test.skip(!isTeamChatEnabled(), 'Team chat is disabled in this environment');

test.describe('Team Messenger', () => {
  test('team messenger route requires authentication', async ({ page }) => {
    await page.goto(TEAM_CHAT_ROUTE, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/(login|setup)(?:\?|$)/);
  });

  test('shows the staff messenger dock on authenticated pages', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(authenticatedPage, {
      url: /\/dashboard(?:\?|$)/,
      selectors: ['button:has-text("Team Messenger")'],
      timeoutMs: 25000,
    });

    await expectCriticalSection(authenticatedPage, ['button:has-text("Team Messenger")']);
  });

  test('loads the Team Messenger page and keeps messaging surfaces distinct', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(TEAM_CHAT_ROUTE, { waitUntil: 'domcontentloaded' });
    await waitForPageReady(authenticatedPage, {
      url: /\/team-chat(?:\?|$)/,
      selectors: [
        'h1:has-text("Team Messenger")',
        'text=Start a direct message',
        'text=Create a group',
      ],
      timeoutMs: 25000,
    });

    await expectCriticalSection(authenticatedPage, [
      'h1:has-text("Team Messenger")',
      'text=Portal Conversations',
      'text=Case Chat',
    ]);

    await expect(authenticatedPage.getByRole('button', { name: 'Create group chat' })).toBeVisible();
  });
});
