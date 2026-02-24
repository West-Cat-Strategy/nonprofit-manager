import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { createTestContact, clearDatabase } from '../helpers/database';
import { unwrapList, unwrapSuccess } from '../helpers/apiEnvelope';

const apiURL = process.env.API_URL || 'HTTP://localhost:3001';

const uniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;

function isMobileLayout(page: Page): boolean {
    return (page.viewportSize()?.width ?? 1024) < 768;
}

function caseTitleLocator(page: Page, title: string) {
    if (isMobileLayout(page)) {
        return page
            .locator('div.md\\:hidden')
            .locator('div.text-lg.font-black.text-black', { hasText: title })
            .first();
    }

    return page.locator('tbody tr', { hasText: title }).first();
}

function firstCaseSelectionCheckbox(page: Page) {
    if (isMobileLayout(page)) {
        return page.locator('div.md\\:hidden input[type="checkbox"]').first();
    }

    return page.locator('tbody input[type="checkbox"]').first();
}

async function getWriteHeaders(page: Page, token: string): Promise<Record<string, string>> {
    const organizationId = await page
        .evaluate(() => localStorage.getItem('organizationId'))
        .catch(() => null);
    const csrfResponse = await page.request.get(`${apiURL}/api/auth/csrf-token`, {
        headers: {
            Authorization: `Bearer ${token}`,
            ...(organizationId ? { 'X-Organization-Id': organizationId } : {}),
        },
    });
    if (!csrfResponse.ok()) {
        throw new Error(`Failed to fetch CSRF token (${csrfResponse.status()})`);
    }
    const csrfData = unwrapSuccess<{ csrfToken?: string }>(await csrfResponse.json());
    if (!csrfData?.csrfToken) {
        throw new Error('CSRF token missing in response');
    }

    const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfData.csrfToken,
    };
    if (organizationId) {
        headers['X-Organization-Id'] = organizationId;
    }
    return headers;
}

async function getReadHeaders(page: Page, token: string): Promise<Record<string, string>> {
    const organizationId = await page
        .evaluate(() => localStorage.getItem('organizationId'))
        .catch(() => null);
    const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
    if (organizationId) {
        headers['X-Organization-Id'] = organizationId;
    }
    return headers;
}

async function clearCases(page: Page, token: string): Promise<void> {
    const headers = await getReadHeaders(page, token);
    const listResponse = await page.request.get(`${apiURL}/api/cases?limit=100`, {
        headers,
    });
    if (!listResponse.ok()) return;

    const listData = unwrapSuccess<{ cases?: Array<{ id?: string }> }>(await listResponse.json());
    const cases = listData?.cases || [];
    for (const item of cases) {
        if (!item?.id) continue;
        const headers = await getWriteHeaders(page, token);
        await page.request.delete(`${apiURL}/api/cases/${item.id}`, { headers });
    }
}

async function getFirstCaseTypeId(page: Page, token: string): Promise<string> {
    const headers = await getReadHeaders(page, token);
    const response = await page.request.get(`${apiURL}/api/cases/types`, {
        headers,
    });
    if (!response.ok()) {
        throw new Error(`Failed to fetch case types (${response.status()})`);
    }
    const data = unwrapSuccess<{ types?: Array<{ id?: string }> }>(await response.json());
    const firstTypeId = data?.types?.[0]?.id;
    if (!firstTypeId) {
        throw new Error('No case types available for tests');
    }
    return firstTypeId;
}

async function createTestCase(
    page: Page,
    token: string,
    data: {
        title: string;
        contactId?: string;
        priority?: 'low' | 'medium' | 'high' | 'critical';
        isUrgent?: boolean;
        description?: string;
    }
): Promise<{ id: string }> {
    const contactId = data.contactId || (
        await createTestContact(page, token, {
            firstName: 'Case',
            lastName: `Contact-${uniqueSuffix()}`,
            email: `case.contact.${uniqueSuffix()}@example.com`,
        })
    ).id;

    const caseTypeId = await getFirstCaseTypeId(page, token);
    const headers = await getWriteHeaders(page, token);

    const response = await page.request.post(`${apiURL}/api/cases`, {
        headers,
        data: {
            contact_id: contactId,
            case_type_id: caseTypeId,
            title: data.title,
            description: data.description || 'Test case description',
            priority: data.priority || 'medium',
            is_urgent: data.isUrgent || false,
        },
    });

    if (!response.ok()) {
        throw new Error(`Failed to create test case (${response.status()}): ${await response.text()}`);
    }

    const result = unwrapSuccess<{ id?: string; data?: { id?: string } }>(await response.json());
    const caseId = result?.id ?? result?.data?.id;
    if (!caseId) {
        throw new Error(`Missing case id in response: ${JSON.stringify(result)}`);
    }

    return { id: caseId };
}

async function createCaseNote(
    page: Page,
    token: string,
    caseId: string,
    content: string
): Promise<{ id: string }> {
    const headers = await getWriteHeaders(page, token);
    const response = await page.request.post(`${apiURL}/api/cases/notes`, {
        headers,
        data: {
            case_id: caseId,
            note_type: 'case_note',
            content,
            is_internal: false,
            is_important: false,
        },
    });

    if (!response.ok()) {
        throw new Error(`Failed to create case note (${response.status()}): ${await response.text()}`);
    }

    const data = unwrapSuccess<{ id?: string; data?: { id?: string } }>(await response.json());
    const id = data?.id || data?.data?.id;
    if (!id) {
        throw new Error(`Missing case note id in response: ${JSON.stringify(data)}`);
    }

    return { id };
}

test.describe('Cases Module', () => {
    test.beforeEach(async ({ authenticatedPage, authToken }) => {
        await clearCases(authenticatedPage, authToken);
        await clearDatabase(authenticatedPage, authToken);
    });

    test('should display cases list page', async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/cases');

        await expect(authenticatedPage.getByRole('heading', { name: /cases/i }).first()).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /new case/i })).toBeVisible();
    });

    test('should create a new case via UI', async ({ authenticatedPage, authToken }) => {
        const suffix = uniqueSuffix();
        const firstName = `Case${suffix}`;
        const lastName = 'Subject';
        const title = `Test Case ${suffix}`;

        await createTestContact(authenticatedPage, authToken, {
            firstName,
            lastName,
            email: `case.subject.${suffix}@test.com`
        });

        await authenticatedPage.goto('/cases/new');

        await authenticatedPage.locator('input[name="contact_lookup"]').fill(firstName);
        await authenticatedPage
            .locator('button', { hasText: new RegExp(`${firstName}\\s+${lastName}`, 'i') })
            .first()
            .click();
        await expect(authenticatedPage.locator('input[name="contact_id"]')).not.toHaveValue('');

        const typeSelect = authenticatedPage.locator('select[name="case_type_id"]');
        await expect(typeSelect).toBeVisible();
        await typeSelect.selectOption({ index: 1 });

        await authenticatedPage.locator('input[name="title"]').fill(title);
        await authenticatedPage.locator('textarea[name="description"]').fill('This is a test case description.');
        await authenticatedPage.locator('form').getByRole('button', { name: /create case/i }).click();

        await authenticatedPage.waitForURL(/\/cases$/);
        await expect(caseTitleLocator(authenticatedPage, title)).toBeVisible({ timeout: 10000 });
    });

    test('should prefill create form from query params', async ({ authenticatedPage, authToken }) => {
        const suffix = uniqueSuffix();
        const firstName = `Prefill${suffix}`;
        const lastName = 'Contact';
        const title = `Prefilled Case ${suffix}`;

        const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
            firstName,
            lastName,
            email: `prefill.${suffix}@example.com`,
        });

        await authenticatedPage.goto(
            `/cases/new?contact_id=${contactId}&title=${encodeURIComponent(title)}&is_urgent=true`
        );

        await expect(authenticatedPage.getByText(/prefilled context applied/i)).toBeVisible();
        await expect(authenticatedPage.locator('input[name="title"]')).toHaveValue(title);
        await expect(authenticatedPage.locator('input[name="is_urgent"]')).toBeChecked();
        await expect(authenticatedPage.locator('input[name="contact_lookup"]')).toHaveValue(
            new RegExp(firstName, 'i')
        );
    });

    test('should support quick filter deep links', async ({ authenticatedPage, authToken }) => {
        const suffix = uniqueSuffix();
        const urgentTitle = `Urgent Case ${suffix}`;
        const normalTitle = `Normal Case ${suffix}`;

        await createTestCase(authenticatedPage, authToken, {
            title: urgentTitle,
            priority: 'critical',
            isUrgent: true,
        });
        await createTestCase(authenticatedPage, authToken, {
            title: normalTitle,
            priority: 'low',
        });

        await authenticatedPage.goto('/cases?quick_filter=urgent');

        await expect(caseTitleLocator(authenticatedPage, urgentTitle)).toBeVisible();
        await expect(caseTitleLocator(authenticatedPage, normalTitle)).not.toBeVisible();

        await authenticatedPage.locator('input[placeholder*="Search by case number"]').fill(urgentTitle);
        await authenticatedPage.keyboard.press('Enter');

        await expect(authenticatedPage).toHaveURL(/quick_filter=urgent/);
        await expect(authenticatedPage).toHaveURL(/search=/);
    });

    test('should support case detail to edit flow', async ({ authenticatedPage, authToken }) => {
        const suffix = uniqueSuffix();
        const originalTitle = `Case Detail ${suffix}`;
        const updatedTitle = `Case Detail Updated ${suffix}`;
        const { id } = await createTestCase(authenticatedPage, authToken, {
            title: originalTitle,
        });

        await authenticatedPage.goto(`/cases/${id}`);
        await expect(authenticatedPage.getByText(originalTitle)).toBeVisible();

        await authenticatedPage.getByRole('button', { name: /^edit$/i }).click();
        await authenticatedPage.waitForURL(new RegExp(`/cases/${id}/edit$`));

        await authenticatedPage.locator('input[name="title"]').fill(updatedTitle);
        await authenticatedPage.locator('form').getByRole('button', { name: /update case/i }).click();

        await authenticatedPage.waitForURL(new RegExp(`/cases/${id}$`));
        await expect(authenticatedPage.getByText(updatedTitle)).toBeVisible();
    });

    test('should show bulk action bar when selecting cases', async ({ authenticatedPage, authToken }) => {
        const suffix = uniqueSuffix();
        await createTestCase(authenticatedPage, authToken, { title: `Bulk Case A ${suffix}` });
        await createTestCase(authenticatedPage, authToken, { title: `Bulk Case B ${suffix}` });

        await authenticatedPage.goto('/cases');

        const firstRowCheckbox = firstCaseSelectionCheckbox(authenticatedPage);
        await firstRowCheckbox.check();

        await expect(authenticatedPage.getByText(/1 case selected/i)).toBeVisible();
        await authenticatedPage.getByRole('button', { name: /^clear$/i }).click();
        await expect(authenticatedPage.getByText(/1 case selected/i)).not.toBeVisible();
    });

    test('staff can tag an interaction outcome and see it persisted', async ({ authenticatedPage, authToken }) => {
        const suffix = uniqueSuffix();
        const { id: caseId } = await createTestCase(authenticatedPage, authToken, {
            title: `Outcome Case ${suffix}`,
        });
        const { id: noteId } = await createCaseNote(
            authenticatedPage,
            authToken,
            caseId,
            `Outcome note ${suffix}`
        );

        const readHeaders = await getReadHeaders(authenticatedPage, authToken);
        const definitionsResponse = await authenticatedPage.request.get(
            `${apiURL}/api/cases/outcomes/definitions`,
            { headers: readHeaders }
        );
        expect(definitionsResponse.ok()).toBeTruthy();

        const definitions = unwrapList<{ id: string; name: string }>(await definitionsResponse.json());
        const firstDefinition = definitions?.[0];
        expect(firstDefinition?.id).toBeTruthy();

        const writeHeaders = await getWriteHeaders(authenticatedPage, authToken);
        const saveResponse = await authenticatedPage.request.put(
            `${apiURL}/api/cases/${caseId}/interactions/${noteId}/outcomes`,
            {
                headers: writeHeaders,
                data: {
                    mode: 'replace',
                    impacts: [
                        {
                            outcomeDefinitionId: firstDefinition.id,
                            attribution: 'DIRECT',
                            intensity: 3,
                            evidenceNote: 'Documented in e2e',
                        },
                    ],
                },
            }
        );
        expect(saveResponse.ok()).toBeTruthy();

        const savedImpacts = unwrapList<Record<string, unknown>>(await saveResponse.json());
        expect(savedImpacts.length).toBe(1);

        await authenticatedPage.goto(`/cases/${caseId}`);
        await authenticatedPage.getByRole('tab', { name: /notes/i }).click();
        await expect(authenticatedPage.getByText(firstDefinition.name).first()).toBeVisible({ timeout: 10000 });

        await authenticatedPage.reload();
        await authenticatedPage.getByRole('tab', { name: /notes/i }).click();
        await expect(authenticatedPage.getByText(firstDefinition.name).first()).toBeVisible({ timeout: 10000 });
    });
});
