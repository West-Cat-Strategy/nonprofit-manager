import { test, expect } from '@playwright/test';
import { loginPortalUserUI, provisionApprovedPortalUser } from '../helpers/portal';

test.describe('Portal Messaging + Appointments', () => {
  test('redirects unauthenticated users to portal login for protected portal routes', async ({ page }) => {
    await page.goto('/portal/messages');
    await expect(page).toHaveURL(/\/portal\/login/);

    await page.goto('/portal/appointments');
    await expect(page).toHaveURL(/\/portal\/login/);
  });

  test('renders portal auth entry points', async ({ page }) => {
    await page.goto('/portal/login');
    await expect(page.getByRole('heading', { name: /portal/i })).toBeVisible();

    await page.goto('/portal/signup');
    await expect(page.getByRole('heading', { name: /request portal access/i })).toBeVisible();
  });

  test('persists selected case context between messages and appointments pages', async ({ page }) => {
    await page.route('**/api/v2/portal/pointperson/context', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            default_case_id: 'case-1',
            selected_case_id: 'case-1',
            cases: [
              {
                case_id: 'case-1',
                case_number: 'CASE-001',
                case_title: 'Housing Support',
                assigned_to: 'staff-1',
                pointperson_first_name: 'Alex',
                pointperson_last_name: 'Rivera',
                is_messageable: true,
                is_default: true,
              },
              {
                case_id: 'case-2',
                case_number: 'CASE-002',
                case_title: 'Employment Support',
                assigned_to: 'staff-2',
                pointperson_first_name: 'Sam',
                pointperson_last_name: 'Jordan',
                is_messageable: true,
                is_default: false,
              },
            ],
          },
        }),
      });
    });

    await page.route('**/api/v2/portal/messages/threads**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: { threads: [] } }),
        });
        return;
      }

      await route.continue();
    });

    await page.route('**/api/v2/portal/appointments**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
        return;
      }

      await route.continue();
    });

    await page.route('**/api/v2/portal/appointments/slots**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            selected_case_id: 'case-2',
            selected_pointperson_user_id: 'staff-2',
            slots: [],
          },
        }),
      });
    });

    const portalUser = await provisionApprovedPortalUser(page);
    await loginPortalUserUI(page, portalUser);

    await page.goto('/portal');
    await page.evaluate(() => {
      localStorage.setItem('portal:selectedCaseId', 'case-2');
    });

    await page.goto('/portal/messages');
    const messageCaseSelect = page.getByRole('combobox').first();
    await expect(messageCaseSelect).toHaveValue('case-2');

    await messageCaseSelect.selectOption('case-1');
    await expect
      .poll(async () => page.evaluate(() => localStorage.getItem('portal:selectedCaseId')))
      .toBe('case-1');

    await page.goto('/portal/appointments');
    await expect(page.getByRole('combobox').first()).toHaveValue('case-1');
  });
});
