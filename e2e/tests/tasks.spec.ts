/**
 * Tasks Module E2E Tests
 */

import { test, expect, type Page } from '../fixtures/auth.fixture';
import { clearDatabase, getAuthHeaders } from '../helpers/database';

async function createTestTask(
  page: Page,
  token: string,
  data: {
    subject: string;
    status?: string;
    priority?: string;
    dueDate?: string;
  }
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || 'http://localhost:3001';
  const headers = await getAuthHeaders(page, token);

  const response = await page.request.post(`${apiURL}/api/tasks`, {
    headers,
    data: {
      subject: data.subject,
      status: data.status || 'not_started',
      priority: data.priority || 'normal',
      due_date: data.dueDate,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test task (${response.status()}): ${await response.text()}`);
  }

  const result = await response.json();
  return { id: result.id };
}

test.describe('Tasks Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display tasks list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tasks');
    await expect(authenticatedPage.getByRole('button', { name: '+ New Task' })).toBeVisible();
    await expect(authenticatedPage.getByLabel('Search tasks')).toBeVisible();
  });

  test('should create a new task via UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tasks/new');
    await authenticatedPage.fill('input[name="subject"]', 'Follow up with donors');
    await authenticatedPage.selectOption('select[name="priority"]', 'high');
    await authenticatedPage.fill('textarea[name="description"]', 'Contact donors to thank them');
    await expect(authenticatedPage.getByRole('button', { name: 'Create Task' })).toBeVisible();
  });

  test('should show validation errors for required fields', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tasks/new');
    await authenticatedPage.click('button[type="submit"]');
    const validationMessage = await authenticatedPage
      .locator('input[name="subject"]')
      .evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(validationMessage).toMatch(/fill out this field/i);
  });

  test('should view and edit task details', async ({ authenticatedPage, authToken }) => {
    const { id } = await createTestTask(authenticatedPage, authToken, {
      subject: 'Review grant application',
      priority: 'high',
      status: 'in_progress',
    });

    await authenticatedPage.goto(`/tasks/${id}`);
    await expect(authenticatedPage.getByRole('heading', { name: 'Review grant application' })).toBeVisible();
    await authenticatedPage.getByRole('button', { name: 'Edit' }).click();
    await authenticatedPage.waitForURL(new RegExp(`/tasks/${id}/edit$`));
    await authenticatedPage.selectOption('select[name="priority"]', 'urgent');
    await expect(authenticatedPage.getByRole('button', { name: 'Update Task' })).toBeVisible();
  });

  test('should mark task as complete', async ({ authenticatedPage, authToken }) => {
    const apiURL = process.env.API_URL || 'http://localhost:3001';
    const headers = await getAuthHeaders(authenticatedPage, authToken);
    const { id } = await createTestTask(authenticatedPage, authToken, {
      subject: 'Complete Test Task',
      status: 'in_progress',
    });

    const response = await authenticatedPage.request.post(`${apiURL}/api/tasks/${id}/complete`, {
      headers,
    });
    expect(response.ok()).toBeTruthy();
  });

  test('should filter tasks by status and priority', async ({ authenticatedPage, authToken }) => {
    await createTestTask(authenticatedPage, authToken, {
      subject: 'In Progress High Priority',
      status: 'in_progress',
      priority: 'high',
    });
    await createTestTask(authenticatedPage, authToken, {
      subject: 'Completed Low Priority',
      status: 'completed',
      priority: 'low',
    });

    await authenticatedPage.goto('/tasks');
    await authenticatedPage.getByLabel('Filter by status').selectOption('in_progress');
    await authenticatedPage.getByLabel('Filter by priority').selectOption('high');
    await authenticatedPage.waitForTimeout(500);
    await expect(authenticatedPage.getByText('In Progress High Priority').first()).toBeVisible();
  });

  test('should search and paginate tasks', async ({ authenticatedPage, authToken }) => {
    for (let i = 1; i <= 25; i++) {
      await createTestTask(authenticatedPage, authToken, {
        subject: `Task ${i.toString().padStart(2, '0')}`,
      });
    }

    await authenticatedPage.goto('/tasks');
    await authenticatedPage.getByLabel('Search tasks').fill('Task 25');
    await expect(authenticatedPage.getByText('Task 25').first()).toBeVisible();
    await authenticatedPage.getByLabel('Search tasks').fill('');
    await expect(authenticatedPage.getByRole('button', { name: '2', exact: true })).toBeVisible();
  });
});
