/**
 * Tasks Module E2E Tests
 * Tests for task CRUD, status management, and completion tracking
 */

import { test, expect } from '../fixtures/auth.fixture';
import { clearDatabase } from '../helpers/database';

/**
 * Create test task via API
 */
async function createTestTask(
  page: any,
  token: string,
  data: {
    subject: string;
    status?: string;
    priority?: string;
    dueDate?: string;
    relatedToType?: string;
    relatedToId?: string;
  }
): Promise<{ id: string }> {
  const apiURL = process.env.API_URL || 'http://localhost:3000';

  const response = await page.request.post(`${apiURL}/api/tasks`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      status: 'not_started',
      priority: 'medium',
      ...data,
    },
  });

  const result = await response.json();
  return { id: result.id };
}

test.describe('Tasks Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    // Clear database before each test
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display tasks list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tasks');

    // Check page title
    await expect(authenticatedPage.locator('h1')).toContainText(/tasks/i);

    // Check for "Create Task" button
    await expect(
      authenticatedPage.locator('button:has-text("New Task"), a:has-text("New Task")')
    ).toBeVisible();

    // Check for search input
    await expect(
      authenticatedPage.locator('input[placeholder*="Search"]')
    ).toBeVisible();
  });

  test('should create a new task via UI', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/tasks');

    // Click "New Task" button
    await authenticatedPage.click('text=/New Task|Create Task/i');

    // Wait for form
    await authenticatedPage.waitForURL(/\/tasks\/(new|create)/);

    // Fill form
    await authenticatedPage.fill('input[name="subject"]', 'Follow up with donors');
    await authenticatedPage.selectOption('select[name="priority"]', 'high');

    // Set due date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await authenticatedPage.fill(
      'input[name="dueDate"]',
      tomorrow.toISOString().split('T')[0]
    );

    // Fill description if exists
    const descriptionField = authenticatedPage.locator('textarea[name="description"]');
    if (await descriptionField.isVisible()) {
      await descriptionField.fill('Contact donors to thank them for their support');
    }

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect to task detail page
    await authenticatedPage.waitForURL(/\/tasks\/[a-f0-9-]+$/);

    // Check that task details are displayed
    await expect(
      authenticatedPage.locator('text=Follow up with donors')
    ).toBeVisible();
  });

  test('should show validation errors for required fields', async ({
    authenticatedPage,
  }) => {
    await authenticatedPage.goto('/tasks/new');

    // Submit without filling required fields
    await authenticatedPage.click('button[type="submit"]');

    // Check for validation errors
    await expect(
      authenticatedPage.locator('text=/subject.*required/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should view task details', async ({ authenticatedPage, authToken }) => {
    // Create test task
    const { id } = await createTestTask(authenticatedPage, authToken, {
      subject: 'Review grant application',
      priority: 'high',
      status: 'in_progress',
    });

    // Navigate to task detail page
    await authenticatedPage.goto(`/tasks/${id}`);

    // Check task details are displayed
    await expect(
      authenticatedPage.locator('text=Review grant application')
    ).toBeVisible();
    await expect(authenticatedPage.locator('text=/High|high/i')).toBeVisible();

    // Check for edit button
    await expect(
      authenticatedPage.locator('button:has-text("Edit"), a:has-text("Edit")')
    ).toBeVisible();
  });

  test('should edit task details', async ({ authenticatedPage, authToken }) => {
    // Create test task
    const { id } = await createTestTask(authenticatedPage, authToken, {
      subject: 'Original Task Subject',
      priority: 'low',
    });

    // Navigate to task detail page
    await authenticatedPage.goto(`/tasks/${id}`);

    // Click edit button
    await authenticatedPage.click('text=/Edit/i');

    // Wait for edit form
    await authenticatedPage.waitForURL(/\/tasks\/[a-f0-9-]+\/edit/);

    // Change priority
    await authenticatedPage.selectOption('select[name="priority"]', 'urgent');

    // Submit form
    await authenticatedPage.click('button[type="submit"]');

    // Should redirect back to detail page
    await authenticatedPage.waitForURL(`/tasks/${id}`);

    // Check updated priority is displayed
    await expect(
      authenticatedPage.locator('text=/Urgent|urgent/i')
    ).toBeVisible();
  });

  test('should delete task', async ({ authenticatedPage, authToken }) => {
    // Create test task
    const { id } = await createTestTask(authenticatedPage, authToken, {
      subject: 'Delete Test Task',
    });

    // Navigate to task detail page
    await authenticatedPage.goto(`/tasks/${id}`);

    // Click delete button
    await authenticatedPage.click('button:has-text("Delete")');

    // Confirm deletion in modal
    await authenticatedPage.click('button:has-text("Confirm"), button:has-text("Delete")');

    // Should redirect to tasks list
    await authenticatedPage.waitForURL('/tasks');

    // Navigate to deleted task (should show 404 or redirect)
    await authenticatedPage.goto(`/tasks/${id}`);

    // Should show error or redirect
    await expect(
      authenticatedPage.locator('text=/not found|doesn\'t exist/i')
    ).toBeVisible({ timeout: 5000 });
  });

  test('should mark task as complete', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test task
    const { id } = await createTestTask(authenticatedPage, authToken, {
      subject: 'Complete Test Task',
      status: 'in_progress',
    });

    // Navigate to task detail page
    await authenticatedPage.goto(`/tasks/${id}`);

    // Click complete button
    const completeButton = authenticatedPage.locator(
      'button:has-text("Complete"), button:has-text("Mark Complete")'
    );

    if (await completeButton.isVisible()) {
      await completeButton.click();

      // Wait for status update
      await authenticatedPage.waitForTimeout(1000);

      // Should show completed status
      await expect(
        authenticatedPage.locator('text=/Completed|Complete/i')
      ).toBeVisible();

      // Should show completion date
      await expect(
        authenticatedPage.locator('text=/Completed.*:|Completed on/i')
      ).toBeVisible();
    }
  });

  test('should filter tasks by status', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create tasks with different statuses
    await createTestTask(authenticatedPage, authToken, {
      subject: 'Not Started Task',
      status: 'not_started',
    });

    await createTestTask(authenticatedPage, authToken, {
      subject: 'In Progress Task',
      status: 'in_progress',
    });

    await createTestTask(authenticatedPage, authToken, {
      subject: 'Completed Task',
      status: 'completed',
    });

    await authenticatedPage.goto('/tasks');
    await authenticatedPage.waitForTimeout(1000);

    // Filter by in_progress status
    const statusFilter = authenticatedPage.locator('select[name="status"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('in_progress');
      await authenticatedPage.waitForTimeout(1000);

      // Should show in progress task
      await expect(
        authenticatedPage.locator('text=In Progress Task')
      ).toBeVisible();

      // Should not show other tasks
      await expect(
        authenticatedPage.locator('text=Not Started Task')
      ).not.toBeVisible();
      await expect(
        authenticatedPage.locator('text=Completed Task')
      ).not.toBeVisible();
    }
  });

  test('should filter tasks by priority', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create tasks with different priorities
    await createTestTask(authenticatedPage, authToken, {
      subject: 'Low Priority Task',
      priority: 'low',
    });

    await createTestTask(authenticatedPage, authToken, {
      subject: 'High Priority Task',
      priority: 'high',
    });

    await authenticatedPage.goto('/tasks');
    await authenticatedPage.waitForTimeout(1000);

    // Filter by high priority
    const priorityFilter = authenticatedPage.locator('select[name="priority"]');
    if (await priorityFilter.isVisible()) {
      await priorityFilter.selectOption('high');
      await authenticatedPage.waitForTimeout(1000);

      // Should show high priority task
      await expect(
        authenticatedPage.locator('text=High Priority Task')
      ).toBeVisible();

      // Should not show low priority task
      await expect(
        authenticatedPage.locator('text=Low Priority Task')
      ).not.toBeVisible();
    }
  });

  test('should show overdue tasks', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create task with past due date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await createTestTask(authenticatedPage, authToken, {
      subject: 'Overdue Task',
      dueDate: yesterday.toISOString(),
      status: 'in_progress',
    });

    await authenticatedPage.goto('/tasks');
    await authenticatedPage.waitForTimeout(1000);

    // Filter by overdue
    const overdueFilter = authenticatedPage.locator(
      'input[type="checkbox"][name="overdue"], button:has-text("Overdue")'
    );

    if (await overdueFilter.isVisible()) {
      await overdueFilter.click();
      await authenticatedPage.waitForTimeout(1000);

      // Should show overdue task
      await expect(
        authenticatedPage.locator('text=Overdue Task')
      ).toBeVisible();

      // Should show overdue indicator
      await expect(
        authenticatedPage.locator('text=/Overdue|Past Due/i')
      ).toBeVisible();
    }
  });

  test('should show task summary statistics', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create tasks with different statuses
    await createTestTask(authenticatedPage, authToken, {
      subject: 'Task 1',
      status: 'completed',
    });

    await createTestTask(authenticatedPage, authToken, {
      subject: 'Task 2',
      status: 'in_progress',
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await createTestTask(authenticatedPage, authToken, {
      subject: 'Task 3',
      status: 'not_started',
      dueDate: tomorrow.toISOString(),
    });

    await authenticatedPage.goto('/tasks');
    await authenticatedPage.waitForTimeout(1000);

    // Should show summary cards
    const hasSummary =
      (await authenticatedPage.locator('text=/Due Today|Due This Week/i').count()) >
        0 ||
      (await authenticatedPage.locator('text=/In Progress|Active/i').count()) > 0;

    expect(hasSummary).toBeTruthy();
  });

  test('should search tasks by subject', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create test tasks
    await createTestTask(authenticatedPage, authToken, {
      subject: 'Prepare annual report',
    });

    await createTestTask(authenticatedPage, authToken, {
      subject: 'Schedule board meeting',
    });

    await authenticatedPage.goto('/tasks');
    await authenticatedPage.waitForTimeout(1000);

    // Search for "annual"
    const searchInput = authenticatedPage.locator('input[placeholder*="Search"]');
    await searchInput.fill('annual');

    // Wait for search results
    await authenticatedPage.waitForTimeout(1000);

    // Should show annual report task
    await expect(
      authenticatedPage.locator('text=Prepare annual report')
    ).toBeVisible();

    // Should not show board meeting task
    await expect(
      authenticatedPage.locator('text=Schedule board meeting')
    ).not.toBeVisible();
  });

  test('should paginate tasks list', async ({
    authenticatedPage,
    authToken,
  }) => {
    // Create 25 test tasks (assuming page size is 20)
    for (let i = 1; i <= 25; i++) {
      await createTestTask(authenticatedPage, authToken, {
        subject: `Task ${i.toString().padStart(2, '0')}`,
      });
    }

    await authenticatedPage.goto('/tasks');

    // Wait for tasks to load
    await authenticatedPage.waitForTimeout(2000);

    // Should see pagination controls
    await expect(
      authenticatedPage.locator('button:has-text("Next"), text=/Next/i')
    ).toBeVisible();

    // Click next page
    await authenticatedPage.click('button:has-text("Next")');

    // Wait for page to load
    await authenticatedPage.waitForTimeout(1000);

    // Should show tasks from page 2
    await expect(
      authenticatedPage.locator('text=/Page 2|2 of/i')
    ).toBeVisible();
  });
});
