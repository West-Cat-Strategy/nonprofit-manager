/**
 * Contacts Module E2E Tests
 * Comprehensive tests for list, create, detail, edit, filter, and delete flows.
 */

import { test, expect } from '../fixtures/auth.fixture';
import type { APIResponse, Page } from '@playwright/test';
import {
  clearDatabase,
  createTestAccount,
  createTestContact,
  createTestEvent,
  getAuthHeaders,
} from '../helpers/database';
import { unwrapSuccess } from '../helpers/apiEnvelope';

const uniqueSuffix = () => `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const apiURL = process.env.API_URL || 'http://localhost:3001';

function parseUrl(input: string): URL | null {
  try {
    return new URL(input);
  } catch {
    try {
      return new URL(input, 'http://127.0.0.1');
    } catch {
      return null;
    }
  }
}

function hasUrlParam(url: string, key: string, expectedValue: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) {
    return false;
  }
  return parsed.searchParams.get(key) === expectedValue;
}

async function expectUrlParam(
  page: Page,
  key: string,
  expectedValue: string,
  timeout = 10000
): Promise<void> {
  await expect
    .poll(() => hasUrlParam(page.url(), key, expectedValue), { timeout })
    .toBe(true);
}

async function expectUrlParamAbsent(page: Page, key: string, timeout = 10000): Promise<void> {
  await expect
    .poll(() => {
      const parsed = parseUrl(page.url());
      return parsed ? !parsed.searchParams.has(key) : false;
    }, { timeout })
    .toBe(true);
}

function parseCreatedContactId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const envelopeData = (payload as Record<string, unknown>).data;
  const data = envelopeData && typeof envelopeData === 'object'
    ? (envelopeData as Record<string, unknown>)
    : null;

  const nestedContact = data?.contact && typeof data.contact === 'object'
    ? (data.contact as Record<string, unknown>)
    : null;

  const candidates: Array<unknown> = [
    (payload as Record<string, unknown>).contact_id,
    data?.contact_id,
    data?.id,
    nestedContact?.contact_id,
    nestedContact?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

function parseCreatedCaseId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const envelopeData = (payload as Record<string, unknown>).data;
  const data = envelopeData && typeof envelopeData === 'object'
    ? (envelopeData as Record<string, unknown>)
    : null;

  const nestedCase = data?.case && typeof data.case === 'object'
    ? (data.case as Record<string, unknown>)
    : null;

  const candidates: Array<unknown> = [
    (payload as Record<string, unknown>).case_id,
    (payload as Record<string, unknown>).id,
    data?.case_id,
    data?.id,
    nestedCase?.case_id,
    nestedCase?.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate;
    }
  }

  return null;
}

async function createContactViaUI(page: Page): Promise<{ contactId: string | null }> {
  const createAttempt = async (): Promise<APIResponse> => {
    const createResponsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().includes('/api/v2/contacts'),
      { timeout: 30000 }
    );

    await page.getByRole('button', { name: /create contact/i }).click();
    return createResponsePromise;
  };

  const createResponse = await createAttempt();
  if (!createResponse.ok()) {
    const body = await createResponse.text().catch(() => '');
    throw new Error(
      `Create contact request failed (${createResponse.status()}): ${body.slice(0, 600)}`
    );
  }

  let parsedPayload: unknown = null;
  try {
    parsedPayload = await createResponse.json();
  } catch {
    parsedPayload = null;
  }

  return { contactId: parseCreatedContactId(parsedPayload) };
}

async function getContactReadHeaders(page: Page, token: string): Promise<Record<string, string>> {
  const organizationId = await page.evaluate(() => localStorage.getItem('organizationId')).catch(() => null);
  const normalizedToken = token?.trim();
  if (!normalizedToken || normalizedToken === 'null' || normalizedToken === 'undefined') {
    return organizationId && organizationId.trim().length > 0 ? { 'X-Organization-Id': organizationId } : {};
  }

  if (organizationId && organizationId.trim().length > 0) {
    return {
      Authorization: `Bearer ${token}`,
      'X-Organization-Id': organizationId,
    };
  }
  return { Authorization: `Bearer ${token}` };
}

async function waitForContactAvailability(page: Page, token: string, contactId: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const headers = await getContactReadHeaders(page, token);
        const endpoints = [`${apiURL}/api/v2/contacts/${contactId}`, `${apiURL}/api/v2/contacts/${contactId}`];

        for (const endpoint of endpoints) {
          const response = await page.request.get(endpoint, { headers });
          if (response.ok()) {
            return true;
          }
          if (response.status() !== 404) {
            return false;
          }
        }

        return false;
      },
      { timeout: 30000, intervals: [500, 1000, 2000] }
    )
    .toBe(true);
}

async function waitForContactPhnSuffix(
  page: Page,
  token: string,
  contactId: string,
  expectedPhn: string
): Promise<void> {
  const resolvePhnFromPayload = (payload: unknown): string | null => {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const envelopeData = (payload as Record<string, unknown>).data;
    const payloadData = envelopeData && typeof envelopeData === 'object'
      ? (envelopeData as Record<string, unknown>)
      : (payload as Record<string, unknown>);

    const nestedContact =
      payloadData.contact && typeof payloadData.contact === 'object'
        ? (payloadData.contact as Record<string, unknown>)
        : null;

    const candidates: Array<unknown> = [
      payloadData.phn,
      nestedContact?.phn,
      (payload as Record<string, unknown>).phn,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }
      const digits = candidate.replace(/\D/g, '');
      if (digits.length > 0) {
        return digits;
      }
    }

    return null;
  };

  const expectedDigits = expectedPhn.replace(/\D/g, '');
  const expectedSuffix = expectedDigits.slice(-4);

  await expect
    .poll(
      async () => {
        const headers = await getContactReadHeaders(page, token);
        const response = await page.request.get(`${apiURL}/api/v2/contacts/${contactId}`, { headers });

        if (!response.ok()) {
          return null;
        }

        const payload = (await response.json().catch(() => null)) as unknown;
        const phnDigits = resolvePhnFromPayload(payload);
        if (!phnDigits) {
          return null;
        }
        if (phnDigits === expectedDigits) {
          return phnDigits;
        }
        if (phnDigits.length <= expectedDigits.length && phnDigits.endsWith(expectedSuffix)) {
          return phnDigits;
        }

        return null;
      },
      { timeout: 30000, intervals: [500, 1000, 2000] }
    )
    .not.toBeNull();
}

async function waitForContactDetailReady(page: Page, headingMatcher?: RegExp): Promise<void> {
  await page.getByText(/loading contact\.\.\./i).waitFor({ state: 'hidden', timeout: 30000 }).catch(() => undefined);
  await expect(page.getByRole('tablist', { name: /contact sections/i })).toBeVisible({ timeout: 30000 });
  if (headingMatcher) {
    await expect(page.getByRole('heading', { name: headingMatcher })).toBeVisible({ timeout: 30000 });
  }
}

type CaseListItem = {
  id?: string;
  title?: string;
  case_number?: string;
};

function extractCaseListItems(payload: unknown): CaseListItem[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  const candidates = [
    record.cases,
    record.items,
    record.data,
    record.results,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as CaseListItem[];
    }

    if (!candidate || typeof candidate !== 'object') {
      continue;
    }

    const nested = candidate as Record<string, unknown>;
    if (Array.isArray(nested.cases)) {
      return nested.cases as CaseListItem[];
    }
    if (Array.isArray(nested.items)) {
      return nested.items as CaseListItem[];
    }
    if (Array.isArray(nested.data)) {
      return nested.data as CaseListItem[];
    }
  }

  return [];
}

async function waitForCaseAssociation(
  page: Page,
  token: string,
  contactId: string,
  caseTitle: string
): Promise<void> {
  await expect
    .poll(
      async () => {
        const headers = await getContactReadHeaders(page, token);
        const response = await page.request.get(
          `${apiURL}/api/v2/cases?contact_id=${contactId}&limit=25&search=${encodeURIComponent(caseTitle)}`,
          { headers }
        );

        if (!response.ok()) {
          return null;
        }

        const payload = unwrapSuccess<unknown>(await response.json());
        return extractCaseListItems(payload).find((caseItem) => caseItem.title === caseTitle) ?? null;
      },
      { timeout: 30000, intervals: [500, 1000, 2000] }
    )
    .not.toBeNull();
}

async function getDefaultCaseTypeId(page: Page, token: string): Promise<string> {
  const headers = await getContactReadHeaders(page, token);
  const response = await page.request.get(`${apiURL}/api/v2/cases/types`, { headers });
  expect(response.ok(), `Failed to load case types: ${await response.text()}`).toBeTruthy();
  const payload = unwrapSuccess<Array<{ id?: string }> | { types?: Array<{ id?: string }> }>(
    await response.json()
  );
  const caseTypes = Array.isArray(payload) ? payload : payload?.types || [];
  const caseTypeId = caseTypes.find((row) => typeof row.id === 'string' && row.id.length > 0)?.id;
  expect(caseTypeId, 'No case type id available for contact detail case creation').toBeTruthy();
  return String(caseTypeId);
}

async function resolveCreatedCaseId(
  createCaseResponse: APIResponse | null,
  page: Page,
  token: string,
  contactId: string,
  caseTitle: string
): Promise<string> {
  if (createCaseResponse) {
    try {
      const payload = unwrapSuccess<unknown>(await createCaseResponse.json());
      const createdCaseId = parseCreatedCaseId(payload);
      if (createdCaseId) {
        return createdCaseId;
      }
    } catch {
      // Firefox can intermittently refuse response body reads for successful POSTs.
      // Fall back to the created case becoming queryable for the contact.
    }
  }

  let associatedCaseId: string | null = null;
  await expect
    .poll(
      async () => {
        const headers = await getContactReadHeaders(page, token);
        const response = await page.request.get(
          `${apiURL}/api/v2/cases?contact_id=${contactId}&limit=25&search=${encodeURIComponent(caseTitle)}`,
          { headers }
        );

        if (!response.ok()) {
          associatedCaseId = null;
          return null;
        }

        const payload = unwrapSuccess<unknown>(await response.json());
        associatedCaseId =
          extractCaseListItems(payload).find((caseItem) => caseItem.title === caseTitle)?.id ?? null;
        return associatedCaseId;
      },
      { timeout: 30000, intervals: [500, 1000, 2000] }
    )
    .not.toBeNull();

  if (!associatedCaseId) {
    throw new Error(`Unable to resolve created case id for contact ${contactId}`);
  }

  return associatedCaseId;
}

async function createContactPhone(
  page: Page,
  token: string,
  contactId: string,
  phoneNumber: string,
  label: 'home' | 'work' | 'mobile' | 'fax' | 'other' = 'other'
): Promise<void> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/v2/contacts/${contactId}/phones`, {
    headers,
    data: {
      phone_number: phoneNumber,
      label,
      is_primary: false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create phone for ${contactId} (${response.status()}): ${await response.text()}`);
  }
}

async function createContactEmail(
  page: Page,
  token: string,
  contactId: string,
  emailAddress: string,
  label: 'personal' | 'work' | 'other' = 'other'
): Promise<void> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/v2/contacts/${contactId}/emails`, {
    headers,
    data: {
      email_address: emailAddress,
      label,
      is_primary: false,
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to create email for ${contactId} (${response.status()}): ${await response.text()}`);
  }
}

async function createContactRelationship(
  page: Page,
  token: string,
  contactId: string,
  relatedContactId: string,
  notes: string
): Promise<void> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.post(`${apiURL}/api/v2/contacts/${contactId}/relationships`, {
    headers,
    data: {
      related_contact_id: relatedContactId,
      relationship_type: 'friend',
      relationship_label: 'Merge test relationship',
      is_bidirectional: true,
      notes,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Failed to create relationship for ${contactId} (${response.status()}): ${await response.text()}`
    );
  }
}

async function deactivateContact(page: Page, token: string, contactId: string): Promise<void> {
  const headers = await getAuthHeaders(page, token);
  const response = await page.request.delete(`${apiURL}/api/v2/contacts/${contactId}`, {
    headers,
  });

  if (!response.ok()) {
    throw new Error(`Failed to deactivate contact ${contactId} (${response.status()}): ${await response.text()}`);
  }
}

test.describe('Contacts Module', () => {
  test.beforeEach(async ({ authenticatedPage, authToken }) => {
    await clearDatabase(authenticatedPage, authToken);
  });

  test('should display contacts list page', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/contacts');

    await expect(authenticatedPage.getByRole('heading', { name: /people/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /new person/i })).toBeVisible();
    await expect(authenticatedPage.getByLabel('Search contacts')).toBeVisible();
  });

  test('contact detail only requests contact-scoped case list', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Scoped${suffix}`,
      lastName: 'Cases',
      email: `scoped.cases.${suffix}@example.com`,
      phone: '5550101234',
    });

    const caseListRequests: string[] = [];
    authenticatedPage.on('request', (request) => {
      const url = request.url();
      if (request.method() === 'GET' && /\/api\/v2\/cases\?/.test(url)) {
        caseListRequests.push(url);
      }
    });

    await authenticatedPage.goto(`/contacts/${contactId}`);
    await waitForContactDetailReady(authenticatedPage);
    await authenticatedPage.waitForTimeout(800);

    const unscopedCaseRequests = caseListRequests.filter(
      (url) => !url.includes(`contact_id=${contactId}`)
    );
    expect(unscopedCaseRequests).toEqual([]);
  });

  test('should create a case from contact detail, show it on case surfaces, and open it from the notes timeline', async ({
    authenticatedPage,
    authToken,
  }, testInfo) => {
    test.skip(
      /^Mobile /.test(testInfo.project.name) || testInfo.project.name === 'Tablet',
      'Desktop-only contact detail regression coverage'
    );

    const suffix = uniqueSuffix();
    const firstName = `Case${suffix}`;
    const lastName = 'Link';
    const caseTitle = `Contact detail case ${suffix}`;
    const noteContent = `Linked case note ${suffix}`;
    const caseTypeId = await getDefaultCaseTypeId(authenticatedPage, authToken);
    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName,
      lastName,
      email: `contact.case.${suffix}@example.com`,
      phone: '5550202233',
    });

    await waitForContactAvailability(authenticatedPage, authToken, contactId);
    await authenticatedPage.goto(`/contacts/${contactId}`);
    await waitForContactDetailReady(authenticatedPage, new RegExp(`${firstName} ${lastName}`, 'i'));

    await authenticatedPage.getByRole('link', { name: /create case/i }).first().click();
    await authenticatedPage.waitForURL(new RegExp(`/cases/new\\?contact_id=${contactId}`), { timeout: 30000 });
    const createCaseUrl = new URL(authenticatedPage.url());
    createCaseUrl.searchParams.set('case_type_id', caseTypeId);
    await authenticatedPage.goto(`${createCaseUrl.pathname}${createCaseUrl.search}`);
    await authenticatedPage.waitForURL(
      new RegExp(`/cases/new\\?contact_id=${contactId}.*case_type_id=${caseTypeId}`),
      { timeout: 30000 }
    );
    await expect(authenticatedPage.getByText(/prefilled context applied/i)).toBeVisible();
    await expect(authenticatedPage.locator('input[name="contact_id"]')).toHaveValue(contactId);
    await expect(authenticatedPage.getByText(/\(Primary\)/)).toBeVisible({ timeout: 30000 });

    await authenticatedPage.locator('#case-title').fill(caseTitle);
    await authenticatedPage.locator('#case-description').fill('Created from the contact detail page.');

    const createCaseResponsePromise = authenticatedPage
      .waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().includes('/api/v2/cases'),
        { timeout: 30000 }
      )
      .catch(() => null);
    const createCaseSubmit = authenticatedPage.getByTestId('case-form-primary-submit');
    await expect(createCaseSubmit).toBeEnabled({ timeout: 30000 });
    await createCaseSubmit.click();

    const createCaseResponse = await createCaseResponsePromise;
    if (createCaseResponse) {
      expect(createCaseResponse.ok()).toBeTruthy();
    }
    const createdCaseId = await resolveCreatedCaseId(
      createCaseResponse,
      authenticatedPage,
      authToken,
      contactId,
      caseTitle
    );

    await authenticatedPage.waitForURL(/\/cases(?:[/?#]|$)/, { timeout: 30000 });
    await waitForCaseAssociation(authenticatedPage, authToken, contactId, caseTitle);

    await expect(authenticatedPage.getByRole('heading', { name: /cases/i }).first()).toBeVisible();
    const casesSearchInput = authenticatedPage.getByPlaceholder(/search by case number, title, or description/i);
    await casesSearchInput.fill(caseTitle);
    await casesSearchInput.press('Enter');
    await expect(authenticatedPage.locator('tbody tr').filter({ hasText: caseTitle }).first()).toBeVisible({
      timeout: 30000,
    });

    await authenticatedPage.goto(`/contacts/${contactId}`);
    await waitForContactDetailReady(authenticatedPage, new RegExp(`${firstName} ${lastName}`, 'i'));

    const associatedCaseLink = authenticatedPage.getByRole('link', { name: new RegExp(caseTitle, 'i') }).first();
    await expect(associatedCaseLink).toBeVisible({ timeout: 30000 });

    await authenticatedPage.getByRole('tab', { name: /notes/i }).click();
    const notesPanel = authenticatedPage.locator('#tabpanel-notes');
    await expect(notesPanel.getByRole('heading', { name: /notes timeline/i })).toBeVisible();
    await notesPanel.getByRole('button', { name: /\+ add note/i }).click();

    const noteForm = notesPanel.getByTestId('contact-note-form');
    await expect(noteForm).toBeVisible({ timeout: 30000 });
    const noteCaseSelect = noteForm.getByTestId('contact-note-case-select');
    await expect(noteCaseSelect).toBeVisible({ timeout: 30000 });
    await expect(noteCaseSelect.locator(`option[value="${createdCaseId}"]`)).toHaveCount(1, {
      timeout: 30000,
    });
    await noteCaseSelect.selectOption({ value: createdCaseId });
    await noteForm.getByLabel(/subject/i).fill(`Case follow-up ${suffix}`);
    await noteForm.getByLabel(/content/i).fill(noteContent);

    const addNoteResponsePromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().includes(`/api/v2/contacts/${contactId}/notes`),
      { timeout: 30000 }
    );

    await noteForm.getByRole('button', { name: /^add note$/i }).click();

    const addNoteResponse = await addNoteResponsePromise;
    expect(addNoteResponse.ok()).toBeTruthy();
    const createdNoteRequest = addNoteResponse.request().postDataJSON() as { case_id?: string };
    expect(createdNoteRequest.case_id).toBe(createdCaseId);

    const savedNoteCard = notesPanel
      .getByTestId('contact-note-card')
      .filter({ hasText: noteContent })
      .first();
    await expect(savedNoteCard).toBeVisible({ timeout: 30000 });
    const timelineCaseLink = savedNoteCard.getByTestId('contact-note-case-link');
    await expect(timelineCaseLink).toBeVisible();
    await timelineCaseLink.click();

    await authenticatedPage.waitForURL(new RegExp(`/cases/${createdCaseId}(?:[/?#]|$)`), { timeout: 30000 });
    await expect(authenticatedPage.getByText(caseTitle).first()).toBeVisible({ timeout: 30000 });
  });

  test('should validate create form required and format errors', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/contacts/new');

    const contactForm = authenticatedPage.locator('form').filter({
      has: authenticatedPage.locator('input[name="first_name"]'),
    });
    const firstNameInput = contactForm.getByLabel(/first name \*/i);
    const lastNameInput = contactForm.getByLabel(/last name \*/i);
    const createButton = contactForm.getByRole('button', { name: /^create contact$/i });

    await expect(firstNameInput).toBeVisible({ timeout: 30000 });
    await expect(createButton).toBeEnabled({ timeout: 30000 });
    await createButton.click();

    await expect(contactForm.getByText(/first name is required/i)).toBeVisible({ timeout: 15000 });
    await expect(contactForm.getByText(/last name is required/i)).toBeVisible({ timeout: 15000 });

    await firstNameInput.fill('Invalid');
    await lastNameInput.fill('Entry');
    await contactForm.getByLabel(/^email$/i).fill('invalid.entry@example.com');
    await contactForm.locator('input[name="phone"]').fill('12345');
    await contactForm.getByLabel(/personal health number \(phn\)/i).fill('12345');

    await createButton.click();

    await expect(contactForm.getByText(/phone number must be at least 10 digits/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(contactForm.getByText(/phn must contain exactly 10 digits/i)).toBeVisible({
      timeout: 15000,
    });
  });

  test('should support PHN create and edit happy path', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const firstName = `Phn${suffix}`;
    const lastName = 'Flow';

    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.getByLabel(/first name \*/i).fill(firstName);
    await authenticatedPage.getByLabel(/last name \*/i).fill(lastName);
    await authenticatedPage.getByLabel(/^email$/i).fill(`phn.${suffix}@example.com`);
    await authenticatedPage.locator('input[name="phone"]').fill('5550201234');
    await authenticatedPage.getByLabel(/personal health number \(phn\)/i).fill('123-456-7890');

    const { contactId } = await createContactViaUI(authenticatedPage);
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/, { timeout: 30000 });

    const contactIdFromUrl = authenticatedPage.url().match(/\/contacts\/([a-f0-9-]+)$/i)?.[1] || null;
    const resolvedContactId = contactIdFromUrl || contactId;
    if (!resolvedContactId) {
      throw new Error('Unable to resolve created contact id');
    }

    await waitForContactAvailability(authenticatedPage, authToken, resolvedContactId);
    await waitForContactDetailReady(authenticatedPage);
    await expect(authenticatedPage.getByText(/1234567890|\*{2,}7890/i)).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /edit contact/i }).click();
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+\/edit$/, { timeout: 30000 });
    await authenticatedPage.getByLabel(/personal health number \(phn\)/i).fill('098-765-4321');
    const updateResponsePromise = authenticatedPage
      .waitForResponse(
        (response) =>
          response.request().method() === 'PUT' &&
          response.url().includes(`/api/v2/contacts/${resolvedContactId}`),
        { timeout: 30000 }
      )
      .catch(() => null);
    await authenticatedPage.getByRole('button', { name: /update contact/i }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse).not.toBeNull();
    expect(updateResponse?.ok()).toBeTruthy();

    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/, { timeout: 30000 }).catch(async () => {
      await authenticatedPage.goto(`/contacts/${resolvedContactId}`);
    });
    await waitForContactPhnSuffix(authenticatedPage, authToken, resolvedContactId, '098-765-4321');
    await authenticatedPage.reload({ waitUntil: 'domcontentloaded' });
    await waitForContactDetailReady(authenticatedPage);
    await expect(authenticatedPage.getByText(/0987654321|\*{2,}4321/i)).toBeVisible();
  });

  test('should support create -> detail -> edit lifecycle', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const firstName = `Flow${suffix}`;
    const lastName = 'Person';
    const email = `flow.${suffix}@example.com`;
    const phone = '5550201234';
    const mobilePhone = '5550205678';

    await authenticatedPage.goto('/contacts/new');

    await authenticatedPage.getByLabel(/first name \*/i).fill(firstName);
    await authenticatedPage.getByLabel(/last name \*/i).fill(lastName);
    await authenticatedPage.getByLabel(/^email$/i).fill(email);
    await authenticatedPage.getByLabel(/date of birth/i).fill('1986-07-09');
    await authenticatedPage.locator('input[name="phone"]').fill(phone);
    await authenticatedPage.locator('input[name="mobile_phone"]').fill(mobilePhone);
    await authenticatedPage.locator('label', { hasText: /staff/i }).first().click();
    await authenticatedPage.locator('label', { hasText: /board member/i }).first().click();

    const { contactId } = await createContactViaUI(authenticatedPage);

    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+$/, { timeout: 30000 }).catch(async () => {
      if (!contactId) {
        throw new Error('Contact create did not redirect and no contact id was returned');
      }
      await authenticatedPage.goto(`/contacts/${contactId}`);
    });

    const contactIdFromUrl = authenticatedPage.url().match(/\/contacts\/([a-f0-9-]+)$/i)?.[1] || null;
    const resolvedContactId = contactIdFromUrl || contactId;
    if (!resolvedContactId) {
      throw new Error('Unable to resolve created contact id from URL or API response');
    }
    await waitForContactAvailability(authenticatedPage, authToken, resolvedContactId);

    await waitForContactDetailReady(
      authenticatedPage,
      new RegExp(`${firstName} ${lastName}`, 'i')
    );
    await expect(
      authenticatedPage.getByRole('heading', { name: new RegExp(`${firstName} ${lastName}`, 'i') })
    ).toBeVisible();
    await expect(authenticatedPage.getByText('Jul 9, 1986')).toBeVisible();
    await expect(authenticatedPage.getByText(/^Staff$/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/^Board Member$/i)).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: email })).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: phone })).toBeVisible();
    await expect(authenticatedPage.getByRole('link', { name: mobilePhone })).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /edit contact/i }).click();
    await authenticatedPage.waitForURL(/\/contacts\/[a-f0-9-]+\/edit$/, { timeout: 30000 });
    await expect(authenticatedPage.getByRole('heading', { name: /edit contact/i })).toBeVisible({
      timeout: 30000,
    });

    const updatedFirstName = `Updated${suffix}`;
    await authenticatedPage.getByLabel(/first name \*/i).fill(updatedFirstName);
    await expect(authenticatedPage.getByLabel(/first name \*/i)).toHaveValue(updatedFirstName);
    await authenticatedPage.getByRole('button', { name: /^cancel$/i }).first().click();
    await waitForContactDetailReady(authenticatedPage);
    await expect(
      authenticatedPage.getByRole('heading', {
        name: new RegExp(`${firstName} ${lastName}`, 'i'),
      })
    ).toBeVisible();
  });

  test('should expose explicit inline contact-method submit actions in dark mode', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const firstName = `Dark${suffix}`;
    const lastName = 'Mode';
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName,
      lastName,
    });

    await authenticatedPage.addInitScript(() => {
      localStorage.setItem('app-color-scheme', 'dark');
    });

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}`);
    await waitForContactDetailReady(authenticatedPage, new RegExp(`${firstName} ${lastName}`, 'i'));

    await expect(
      authenticatedPage.getByRole('heading', { name: new RegExp(`${firstName} ${lastName}`, 'i') })
    ).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /\+ add phone/i }).click();
    const addPhoneForm = authenticatedPage.locator('form', {
      has: authenticatedPage.getByRole('button', { name: /^add phone$/i }),
    });
    await expect(addPhoneForm.getByRole('button', { name: /^add phone$/i })).toBeVisible();
    await addPhoneForm.locator('input[type="tel"]').fill('555-888-1000');
    await addPhoneForm.getByRole('button', { name: /^add phone$/i }).click();
    await expect(authenticatedPage.getByRole('link', { name: '555-888-1000' })).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /\+ add email/i }).click();
    const addEmailForm = authenticatedPage.locator('form', {
      has: authenticatedPage.getByRole('button', { name: /^add email$/i }),
    });
    await expect(addEmailForm.getByRole('button', { name: /^add email$/i })).toBeVisible();
    await addEmailForm.locator('input[type="email"]').fill(`dark.mode.${suffix}@example.com`);
    await addEmailForm.getByRole('button', { name: /^add email$/i }).click();
    await expect(
      authenticatedPage.getByRole('link', { name: `dark.mode.${suffix}@example.com` })
    ).toBeVisible();
  });

  test('should support detail tab navigation for a contact', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const firstName = `Tabs${suffix}`;
    const lastName = 'Contact';
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName,
      lastName,
      email: `tabs.${suffix}@example.com`,
      phone: '5550201111',
    });

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}`);
    await waitForContactDetailReady(authenticatedPage, new RegExp(`${firstName} ${lastName}`, 'i'));

    await authenticatedPage.getByRole('tab', { name: /notes/i }).click();
    const notesPanel = authenticatedPage.locator('#tabpanel-notes');
    await expect(notesPanel.getByRole('heading', { name: /notes timeline/i })).toBeVisible();
    await expect(
      notesPanel.getByText(/no (matching )?notes yet/i)
    ).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /tasks/i }).click();
    await expect(authenticatedPage.locator('#tabpanel-tasks').getByRole('button', { name: /new task/i })).toBeVisible();
    await expect(authenticatedPage.locator('#tabpanel-tasks').getByText(/no tasks yet/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /activity/i }).click();
    const activityPanel = authenticatedPage.locator('#tabpanel-activity');
    await expect(activityPanel.getByRole('heading', { name: /activity timeline/i })).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /communications/i }).click();
    const communicationsPanel = authenticatedPage.locator('#tabpanel-communications');
    await expect(
      communicationsPanel.getByRole('heading', { name: /^communications$/i })
    ).toBeVisible();
    await expect(communicationsPanel.getByText(/no communications yet/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /follow-ups/i }).click();
    await expect(authenticatedPage.locator('#tabpanel-followups')).toBeVisible();
    await expect(authenticatedPage.locator('#tabpanel-followups').getByText(/no follow-ups scheduled/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /documents/i }).click();
    await expect(authenticatedPage.locator('#tabpanel-documents')).toBeVisible();
    await expect(authenticatedPage.locator('#tabpanel-documents').getByText(/no documents uploaded yet/i)).toBeVisible();

    await authenticatedPage.getByRole('tab', { name: /payments/i }).click();
    await expect(
      authenticatedPage.locator('#tabpanel-payments').getByRole('heading', { name: /payment history/i }).first()
    ).toBeVisible();
  });

  test('should save a follow-up from the contact detail page and keep it visible after reload', async ({
    authenticatedPage,
    authToken,
  }, testInfo) => {
    test.skip(
      /^Mobile /.test(testInfo.project.name) || testInfo.project.name === 'Tablet',
      'Desktop-only contact detail regression coverage'
    );

    const suffix = uniqueSuffix();
    const firstName = `Follow${suffix}`;
    const lastName = 'Contact';
    const followUpTitle = `Contact follow-up ${suffix}`;
    const followUpDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName,
      lastName,
      email: `contact.followup.${suffix}@example.com`,
      phone: '5550204444',
    });

    await waitForContactAvailability(authenticatedPage, authToken, contactId);
    await authenticatedPage.goto(`/contacts/${contactId}`);
    await waitForContactDetailReady(authenticatedPage, new RegExp(`${firstName} ${lastName}`, 'i'));

    await authenticatedPage.getByRole('tab', { name: /follow-ups/i }).click();
    const followUpsPanel = authenticatedPage.locator('#tabpanel-followups');
    await expect(followUpsPanel).toBeVisible();
    await followUpsPanel.getByTestId('contact-followup-toggle').click();

    const followUpForm = followUpsPanel.getByTestId('contact-followup-form');
    await expect(followUpForm).toBeVisible({ timeout: 30000 });
    await followUpForm.getByLabel(/title/i).fill(followUpTitle);
    await followUpForm.getByLabel(/description/i).fill('Saved from the contact detail surface.');
    await followUpForm.getByLabel(/^date/i).fill(followUpDate);
    await followUpForm.getByLabel(/^time$/i).fill('10:15');
    await followUpForm.getByLabel(/method/i).selectOption('phone');

    const createFollowUpResponsePromise = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().includes('/api/v2/follow-ups'),
      { timeout: 30000 }
    );

    await followUpForm.getByRole('button', { name: /schedule follow-up/i }).click();

    const createFollowUpResponse = await createFollowUpResponsePromise;
    expect(createFollowUpResponse.ok()).toBeTruthy();
    const createFollowUpRequest = createFollowUpResponse.request().postDataJSON() as {
      entity_type?: string;
      entity_id?: string;
    };
    expect(createFollowUpRequest.entity_type).toBe('contact');
    expect(createFollowUpRequest.entity_id).toBe(contactId);

    const savedFollowUpCard = followUpsPanel
      .getByTestId('contact-followup-card')
      .filter({ hasText: followUpTitle })
      .first();
    await expect(savedFollowUpCard).toBeVisible({
      timeout: 30000,
    });

    await authenticatedPage.reload({ waitUntil: 'domcontentloaded' });
    await waitForContactDetailReady(authenticatedPage, new RegExp(`${firstName} ${lastName}`, 'i'));
    await authenticatedPage.getByRole('tab', { name: /follow-ups/i }).click();

    const reloadedFollowUpsPanel = authenticatedPage.locator('#tabpanel-followups');
    const reloadedFollowUpCard = reloadedFollowUpsPanel
      .getByTestId('contact-followup-card')
      .filter({ hasText: followUpTitle })
      .first();
    await expect(reloadedFollowUpCard).toBeVisible({ timeout: 30000 });
  });

  test('should create tasks from the contact detail page', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const taskSubject = `Contact task ${suffix}`;
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Task${suffix}`,
      lastName: 'Contact',
      email: `task.${suffix}@example.com`,
      phone: '5550203333',
    });

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}`);
    await waitForContactDetailReady(authenticatedPage);

    await authenticatedPage.getByRole('tab', { name: /tasks/i }).click();
    await authenticatedPage.getByRole('button', { name: /new task/i }).click();
    await authenticatedPage.getByLabel(/subject/i).fill(taskSubject);
    await authenticatedPage.getByLabel(/details/i).fill('Created from the contact detail tab');
    await authenticatedPage.getByLabel(/due date/i).fill('2026-03-16T09:30');

    const createTaskResponse = authenticatedPage.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && response.url().includes('/api/v2/tasks'),
      { timeout: 30000 }
    );

    await authenticatedPage.getByRole('button', { name: /create task/i }).click();

    const response = await createTaskResponse;
    expect(response.ok()).toBeTruthy();
    await expect(authenticatedPage.getByText(taskSubject)).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByRole('link', { name: /open task/i })).toBeVisible();
  });

  test('should render event reminder history in the communications tab', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const eventName = `Reminder Event ${suffix}`;
    const { id: contactId } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Comms${suffix}`,
      lastName: 'Contact',
      email: `comms.${suffix}@example.com`,
      phone: '5550206666',
    });
    const { id: eventId } = await createTestEvent(authenticatedPage, authToken, {
      name: eventName,
      startDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    });

    await authenticatedPage.route(
      `**/api/v2/contacts/${contactId}/communications**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'event-comm',
                  channel: 'email',
                  source_type: 'event_reminder',
                  delivery_status: 'skipped',
                  recipient: `comms.${suffix}@example.com`,
                  error_message: 'SMTP not configured',
                  message_preview: `Reminder: ${eventName} starts soon.`,
                  trigger_type: 'manual',
                  sent_at: new Date().toISOString(),
                  appointment_id: null,
                  case_id: null,
                  event_id: eventId,
                  registration_id: 'registration-1',
                  source_label: eventName,
                  source_subtitle: 'Reminder history seed',
                  action: {
                    type: 'open_event',
                    label: 'Open event',
                    event_id: eventId,
                  },
                },
              ],
              total: 1,
              filters: {},
            },
          }),
        });
      }
    );

    await authenticatedPage.goto(`/contacts/${contactId}`);
    await waitForContactDetailReady(authenticatedPage);
    await authenticatedPage.getByRole('tab', { name: /communications/i }).click();

    const eventCard = authenticatedPage.locator('div.border-2.border-black.bg-white').filter({
      hasText: eventName,
    });
    await expect(eventCard.getByText(eventName, { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(eventCard.getByRole('link', { name: /open event/i })).toHaveAttribute(
      'href',
      `/events/${eventId}`
    );
  });

  test('should only show appointment resend actions when the communication is safe', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Action${suffix}`,
      lastName: 'Contact',
      email: `action.${suffix}@example.com`,
      phone: '5550207777',
    });
    let reminderSendCount = 0;

    await authenticatedPage.route(
      `**/api/v2/contacts/${id}/communications**`,
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              items: [
                {
                  id: 'safe-comm',
                  channel: 'email',
                  source_type: 'appointment_reminder',
                  delivery_status: 'sent',
                  recipient: 'action@example.com',
                  error_message: null,
                  message_preview: 'Reminder for your intake appointment',
                  trigger_type: 'manual',
                  sent_at: new Date().toISOString(),
                  appointment_id: 'appointment-safe',
                  case_id: 'case-safe',
                  event_id: null,
                  registration_id: null,
                  source_label: 'Intake appointment',
                  source_subtitle: 'Safe to resend',
                  action: {
                    type: 'send_appointment_reminder',
                    label: 'Send email reminder again',
                    appointment_id: 'appointment-safe',
                    case_id: 'case-safe',
                  },
                },
                {
                  id: 'unsafe-comm',
                  channel: 'sms',
                  source_type: 'appointment_reminder',
                  delivery_status: 'skipped',
                  recipient: '+15555550100',
                  error_message: 'Appointment start time has passed',
                  message_preview: 'Reminder for a completed appointment',
                  trigger_type: 'automated',
                  sent_at: new Date().toISOString(),
                  appointment_id: 'appointment-unsafe',
                  case_id: 'case-unsafe',
                  event_id: null,
                  registration_id: null,
                  source_label: 'Completed appointment',
                  source_subtitle: 'Not safe to resend',
                  action: {
                    type: 'none',
                    label: 'Unavailable',
                    appointment_id: 'appointment-unsafe',
                    case_id: 'case-unsafe',
                    disabled_reason: 'Appointment start time has passed',
                  },
                },
              ],
              total: 2,
              filters: {},
            },
          }),
        });
      }
    );

    await authenticatedPage.route(
      '**/api/v2/portal/admin/appointments/appointment-safe/reminders/send**',
      async (route) => {
        reminderSendCount += 1;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              summary: {
                email: { attempted: 1, sent: 1, failed: 0, skipped: 0 },
                sms: { attempted: 0, sent: 0, failed: 0, skipped: 0 },
              },
            },
          }),
        });
      }
    );

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}`);
    await waitForContactDetailReady(authenticatedPage);
    await authenticatedPage.getByRole('tab', { name: /communications/i }).click();

    await expect(
      authenticatedPage.getByRole('button', { name: /send email reminder again/i })
    ).toBeVisible();
    await expect(
      authenticatedPage.getByRole('button', { name: /send sms reminder again/i })
    ).toHaveCount(0);
    const unsafeCard = authenticatedPage.locator('div.border-2.border-black.bg-white').filter({
      hasText: 'Completed appointment',
    });
    await expect(unsafeCard.getByText(/^Appointment start time has passed$/i)).toBeVisible();

    await authenticatedPage.getByRole('button', { name: /send email reminder again/i }).click();
    await expect.poll(() => reminderSendCount).toBe(1);
  });

  test('should support cancel navigation in create and edit forms', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();

    await authenticatedPage.goto('/contacts/new');
    const createFormCancelButton = authenticatedPage
      .locator('form button[type="button"]')
      .filter({ hasText: /^Cancel$/ })
      .last();
    await createFormCancelButton.scrollIntoViewIfNeeded();
    await expect(createFormCancelButton).toBeVisible();
    await Promise.all([
      authenticatedPage.waitForURL((url) => url.pathname === '/contacts', { timeout: 30000 }),
      createFormCancelButton.click(),
    ]);
    await expect(authenticatedPage).toHaveURL(/\/contacts$/);

    const { id } = await createTestContact(authenticatedPage, authToken, {
      firstName: `Cancel${suffix}`,
      lastName: 'Flow',
      email: `cancel.${suffix}@example.com`,
      phone: '5550204444',
    });

    await waitForContactAvailability(authenticatedPage, authToken, id);
    await authenticatedPage.goto(`/contacts/${id}/edit`);
    await expect(authenticatedPage.getByRole('heading', { name: /edit contact/i })).toBeVisible({
      timeout: 30000,
    });
    const editFormCancelButton = authenticatedPage
      .locator('form button[type="button"]')
      .filter({ hasText: /^Cancel$/ })
      .last();
    await editFormCancelButton.scrollIntoViewIfNeeded();
    await expect(editFormCancelButton).toBeVisible();
    await Promise.all([
      authenticatedPage.waitForURL((url) => url.pathname === `/contacts/${id}`, { timeout: 30000 }),
      editFormCancelButton.click(),
    ]);
    await waitForContactDetailReady(authenticatedPage, new RegExp(`Cancel${suffix} Flow`, 'i'));
    await expect(authenticatedPage).toHaveURL(new RegExp(`/contacts/${id}$`));
  });

  test('should search contacts and filter by inactive status', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const activeFirstName = `Enabled${suffix}`;
    const inactiveFirstName = `Dormant${suffix}`;

    const activeContact = await createTestContact(authenticatedPage, authToken, {
      firstName: activeFirstName,
      lastName: 'Contact',
      email: `active.${suffix}@example.com`,
      phone: '5550202001',
    });

    const inactiveContact = await createTestContact(authenticatedPage, authToken, {
      firstName: inactiveFirstName,
      lastName: 'Contact',
      email: `inactive.${suffix}@example.com`,
      phone: '5550202002',
    });

    await authenticatedPage.request.delete(`${apiURL}/api/v2/contacts/${inactiveContact.id}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    await authenticatedPage.goto('/contacts');

    await authenticatedPage.getByLabel('Search contacts').fill(activeFirstName);
    await expectUrlParam(authenticatedPage, 'search', activeFirstName);
    const searchButton = authenticatedPage.locator('form').getByRole('button', { name: /^search$/i });
    await searchButton.click();
    await expect
      .poll(
        async () => authenticatedPage.locator(`text=${activeFirstName} Contact`).count(),
        { timeout: 15000, intervals: [500, 1000, 1500] }
      )
      .toBeGreaterThan(0);

    await authenticatedPage.getByLabel('Search contacts').fill('');
    await expectUrlParamAbsent(authenticatedPage, 'search');
    await authenticatedPage.getByLabel('Status').selectOption('inactive');
    await expect(authenticatedPage.getByLabel('Status')).toHaveValue('inactive');
    await expectUrlParam(authenticatedPage, 'status', 'inactive');
    await searchButton.click();
    await expect
      .poll(
        async () => authenticatedPage.locator(`text=${inactiveFirstName} Contact`).count(),
        { timeout: 15000, intervals: [500, 1000, 1500] }
      )
      .toBeGreaterThan(0);
    await expect
      .poll(
        async () => authenticatedPage.locator(`text=${activeFirstName} Contact`).count(),
        { timeout: 15000, intervals: [500, 1000, 1500] }
      )
      .toBe(0);

    await authenticatedPage.goto(`/contacts/${inactiveContact.id}`);
    await expect(authenticatedPage.getByText(/inactive/i).first()).toBeVisible();

    await authenticatedPage.goto(`/contacts/${activeContact.id}`);
    await expect(authenticatedPage.getByText(/active/i).first()).toBeVisible();
  });

  test('should persist contacts list filters in the URL after reload', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const firstName = `Persist${suffix}`;

    await createTestContact(authenticatedPage, authToken, {
      firstName,
      lastName: 'Contact',
      email: `persist.${suffix}@example.com`,
      phone: '5550202100',
    });

    await authenticatedPage.goto('/contacts');
    const searchButton = authenticatedPage.locator('form').getByRole('button', { name: /^search$/i });
    const persistedContactRow = authenticatedPage.locator('tr', { hasText: `${firstName} Contact` });

    await authenticatedPage.getByLabel('Search contacts').fill(firstName);
    await searchButton.click();
    await expectUrlParam(authenticatedPage, 'search', firstName);
    await expect(persistedContactRow).toHaveCount(1, { timeout: 15000 });

    await authenticatedPage.getByLabel('Status').selectOption('active');
    await searchButton.click();
    await expect(authenticatedPage.getByLabel('Status')).toHaveValue('active');
    await expectUrlParam(authenticatedPage, 'status', 'active');

    await expect
      .poll(
        () =>
          hasUrlParam(authenticatedPage.url(), 'search', firstName) &&
          hasUrlParam(authenticatedPage.url(), 'status', 'active'),
        { timeout: 10000 }
      )
      .toBe(true);

    await authenticatedPage.reload();

    await expect(authenticatedPage.getByLabel('Search contacts')).toHaveValue(firstName);
    await expect(authenticatedPage.getByLabel('Status')).toHaveValue('active');
    await expect.poll(
      () => hasUrlParam(authenticatedPage.url(), 'search', firstName) && hasUrlParam(authenticatedPage.url(), 'status', 'active'),
      { timeout: 10000 }
    ).toBe(true);
    await expect(persistedContactRow).toHaveCount(1, { timeout: 15000 });
  });
  test('should merge a contact into an inactive target without losing linked records', async ({
    authenticatedPage,
    authToken,
  }) => {
    const suffix = uniqueSuffix();
    const account = await createTestAccount(authenticatedPage, authToken, {
      name: `Merge Flow ${suffix}`,
      accountType: 'organization',
      category: 'other',
    });

    const sourceContact = await createTestContact(authenticatedPage, authToken, {
      accountId: account.id,
      firstName: `Taylor${suffix}`,
      lastName: 'Contact',
      email: `shared.${suffix}@example.com`,
      phone: '555-600-1000',
    });
    const targetContact = await createTestContact(authenticatedPage, authToken, {
      accountId: account.id,
      firstName: `Morgan${suffix}`,
      lastName: 'Contact',
      email: `shared.${suffix}@example.com`,
      phone: '555-600-1000',
    });
    const relatedSource = await createTestContact(authenticatedPage, authToken, {
      accountId: account.id,
      firstName: `Linked${suffix}`,
      lastName: 'Source',
    });
    const relatedTarget = await createTestContact(authenticatedPage, authToken, {
      accountId: account.id,
      firstName: `Linked${suffix}`,
      lastName: 'Target',
    });

    await createContactPhone(authenticatedPage, authToken, sourceContact.id, '555-600-1001', 'work');
    await createContactPhone(authenticatedPage, authToken, targetContact.id, '555-600-1002', 'work');
    await createContactEmail(authenticatedPage, authToken, sourceContact.id, `source.extra.${suffix}@example.com`, 'work');
    await createContactEmail(authenticatedPage, authToken, targetContact.id, `target.extra.${suffix}@example.com`, 'work');
    await createContactRelationship(
      authenticatedPage,
      authToken,
      sourceContact.id,
      relatedSource.id,
      'Source relationship'
    );
    await createContactRelationship(
      authenticatedPage,
      authToken,
      targetContact.id,
      relatedTarget.id,
      'Target relationship'
    );

    await deactivateContact(authenticatedPage, authToken, targetContact.id);

    await authenticatedPage.goto(`/contacts/${sourceContact.id}`);
    await waitForContactDetailReady(
      authenticatedPage,
      new RegExp(`Taylor${suffix} Contact`, 'i')
    );

    await authenticatedPage.getByRole('button', { name: /merge contact/i }).click();
    const mergeDialog = authenticatedPage.getByRole('dialog', { name: /merge contact/i });
    await expect(mergeDialog).toBeVisible({ timeout: 15000 });

    await mergeDialog.getByLabel(/find target contact/i).fill(`Morgan${suffix}`);
    await mergeDialog.getByRole('button', { name: /^search$/i }).click();
    await expect(mergeDialog.getByText(new RegExp(`Morgan${suffix} Contact`, 'i'))).toBeVisible({
      timeout: 15000,
    });
    await expect(mergeDialog.getByText(/inactive/i).first()).toBeVisible();

    await mergeDialog.getByRole('button', { name: new RegExp(`Morgan${suffix} Contact`, 'i') }).click();
    await expect(mergeDialog.getByText(/conflicting fields/i)).toBeVisible({ timeout: 15000 });

    const firstNameField = mergeDialog.getByRole('group', { name: /first name/i });
    await firstNameField.getByRole('button', { name: /^source/i }).click();
    const activeStatusField = mergeDialog.getByRole('group', { name: /active status/i });
    await activeStatusField.getByRole('button', { name: /^source/i }).click();

    const mergeResponsePromise = authenticatedPage.waitForResponse((response) => {
      return (
        response.request().method() === 'POST' &&
        response.url().includes(`/api/v2/contacts/${sourceContact.id}/merge`)
      );
    });
    await mergeDialog.getByRole('button', { name: /merge contacts/i }).click();
    const mergeResponse = await mergeResponsePromise;
    let mergeResponseBody = '';
    if (!mergeResponse.ok()) {
      mergeResponseBody = await mergeResponse.text().catch(() => '[response body unavailable]');
    }
    expect(mergeResponse.request().postDataJSON()).toMatchObject({
      target_contact_id: targetContact.id,
      resolutions: {
        first_name: 'source',
        is_active: 'source',
      },
    });
    expect(
      mergeResponse.ok(),
      `merge response ${mergeResponse.status()}: ${mergeResponseBody}`
    ).toBeTruthy();
    await expect(authenticatedPage).toHaveURL(new RegExp(`/contacts/${targetContact.id}$`), {
      timeout: 30000,
    });

    await waitForContactDetailReady(
      authenticatedPage,
      new RegExp(`Taylor${suffix} Contact`, 'i')
    );
    await expect(
      authenticatedPage.getByRole('heading', { name: new RegExp(`Taylor${suffix} Contact`, 'i') })
    ).toBeVisible();
    await expect(authenticatedPage.getByText(/active/i).first()).toBeVisible();

    const headers = await getAuthHeaders(authenticatedPage, authToken);
    const mergedResponse = await authenticatedPage.request.get(
      `${apiURL}/api/v2/contacts/${targetContact.id}`,
      { headers }
    );
    expect(mergedResponse.ok()).toBeTruthy();
    const mergedPayload = (await mergedResponse.json()) as {
      data?: {
        first_name?: string;
        is_active?: boolean;
        phone_count?: number;
        email_count?: number;
        relationship_count?: number;
      };
    };
    const mergedData = mergedPayload.data || {};
    expect(mergedData.first_name).toBe(`Taylor${suffix}`);
    expect(mergedData.is_active).toBe(true);
    expect(mergedData.phone_count).toBe(3);
    expect(mergedData.email_count).toBe(3);
    expect(mergedData.relationship_count).toBe(2);
  });

  test('should delete contact from list actions', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const fullName = `Delete${suffix} Contact`;

    await createTestContact(authenticatedPage, authToken, {
      firstName: `Delete${suffix}`,
      lastName: 'Contact',
      email: `delete.${suffix}@example.com`,
      phone: '5550203001',
    });

    await authenticatedPage.goto('/contacts');
    await authenticatedPage.getByLabel('Search contacts').fill(`Delete${suffix}`);
    await authenticatedPage.locator('form').getByRole('button', { name: /^search$/i }).click();
    await expect
      .poll(
        async () => authenticatedPage.locator('tr', { hasText: fullName }).count(),
        { timeout: 15000, intervals: [500, 1000, 1500] }
      )
      .toBeGreaterThan(0);
    const row = authenticatedPage.locator('tr', { hasText: fullName }).first();

    await row.getByRole('button', { name: /delete/i }).click();
    const confirmDeleteDialog = authenticatedPage
      .locator('.fixed.inset-0.z-50')
      .filter({ hasText: new RegExp(`Delete\\s+${fullName}`, 'i') });
    await expect(confirmDeleteDialog).toBeVisible({ timeout: 10000 });
    await confirmDeleteDialog.getByRole('button', { name: /^delete$/i }).click();

    await expect(authenticatedPage.locator('tr', { hasText: fullName })).toHaveCount(0, { timeout: 10000 });
  });

  test('should paginate contacts list', async ({ authenticatedPage, authToken }) => {
    const suffix = uniqueSuffix();
    const searchTerm = `Page${suffix}`;

    for (let i = 1; i <= 25; i++) {
      await createTestContact(authenticatedPage, authToken, {
        firstName: searchTerm,
        lastName: `${i.toString().padStart(2, '0')}`,
        email: `page.${suffix}.${i}@example.com`,
        phone: `555020${(1000 + i).toString().slice(-4)}`,
      });
    }

    await authenticatedPage.goto('/contacts');
    await authenticatedPage.getByLabel('Search contacts').fill(searchTerm);
    const statusFilter = authenticatedPage.getByLabel('Status');
    await statusFilter.selectOption('active').catch(() => statusFilter.selectOption('').catch(() => undefined));
    const searchRequest = authenticatedPage.waitForResponse((response) => {
      const url = response.url();
      return (
        response.request().method() === 'GET' &&
        response.status() === 200 &&
        url.includes('/api/v2/contacts') &&
        hasUrlParam(url, 'search', searchTerm)
      );
    });
    await authenticatedPage.locator('form').getByRole('button', { name: /^search$/i }).click();
    await searchRequest;
    await expect
      .poll(() => hasUrlParam(authenticatedPage.url(), 'search', searchTerm), { timeout: 10000 })
      .toBe(true);

    const nextButton = authenticatedPage.getByRole('button', { name: /next/i });
    await expect(nextButton).toBeVisible({ timeout: 15000 });
    await nextButton.click();

    await expect(authenticatedPage.getByRole('button', { name: /previous/i })).toBeEnabled();
    await expect
      .poll(
        async () => {
          if (await authenticatedPage.getByText(/^Page 2 of 2 \(25 total\)$/i).isVisible().catch(() => false)) {
            return 'desktop';
          }
          if (await authenticatedPage.getByText(/^Page 2 \/ 2 · 25 items$/i).isVisible().catch(() => false)) {
            return 'mobile';
          }
          return null;
        },
        { timeout: 10000, intervals: [250, 500, 1000] }
      )
      .not.toBeNull();
  });
});
