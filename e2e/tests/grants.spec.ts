import { test, expect } from '../fixtures/auth.fixture';
import type { Page } from '@playwright/test';
import { waitForPageReady } from '../helpers/routeHelpers';

type MockGrantEntity = {
  id: string;
  organization_id: string;
  created_by: string | null;
  modified_by: string | null;
  created_at: string;
  updated_at: string;
};

type MockGrantFunder = MockGrantEntity & {
  name: string;
  jurisdiction: string;
  funder_type: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  notes: string | null;
  active: boolean;
  grant_count: number;
  total_amount: number;
};

type MockGrantProgram = MockGrantEntity & {
  funder_id: string;
  funder_name: string;
  name: string;
  program_code: string | null;
  fiscal_year: string | null;
  jurisdiction: string;
  status: string;
  application_open_at: string | null;
  application_due_at: string | null;
  award_date: string | null;
  expiry_date: string | null;
  total_budget: number | null;
  notes: string | null;
  grant_count: number;
  total_amount: number;
};

type MockRecipientOrganization = MockGrantEntity & {
  name: string;
  legal_name: string | null;
  jurisdiction: string | null;
  province: string | null;
  city: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  status: string;
  notes: string | null;
  active: boolean;
  grant_count: number;
  total_amount: number;
};

type MockFundedProgram = MockGrantEntity & {
  recipient_organization_id: string;
  recipient_name: string;
  name: string;
  description: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  notes: string | null;
  grant_count: number;
  total_amount: number;
};

type MockGrantAward = MockGrantEntity & {
  grant_number: string;
  title: string;
  application_id: string | null;
  funder_id: string;
  funder_name: string;
  program_id: string | null;
  program_name: string | null;
  recipient_organization_id: string | null;
  recipient_name: string | null;
  funded_program_id: string | null;
  funded_program_name: string | null;
  status: string;
  amount: number;
  committed_amount: number;
  disbursed_amount: number;
  currency: string;
  fiscal_year: string | null;
  jurisdiction: string;
  award_date: string | null;
  start_date: string | null;
  end_date: string | null;
  expiry_date: string | null;
  reporting_frequency: string | null;
  next_report_due_at: string | null;
  closeout_due_at: string | null;
  notes: string | null;
  outstanding_amount: number;
  report_count: number;
  disbursement_count: number;
};

type MockGrantSummary = {
  total_funders: number;
  total_programs: number;
  total_recipients: number;
  total_funded_programs: number;
  total_applications: number;
  draft_applications: number;
  submitted_applications: number;
  approved_applications: number;
  declined_applications: number;
  total_awards: number;
  active_awards: number;
  total_awarded_amount: number;
  committed_amount: number;
  total_disbursed_amount: number;
  outstanding_amount: number;
  overdue_reports: number;
  upcoming_reports: number;
  upcoming_disbursements: number;
  by_status: Array<{ status: string; count: number; amount: number }>;
  by_jurisdiction: Array<{ status: string; count: number; amount: number }>;
  recent_activity: Array<{
    id: string;
    organization_id: string;
    grant_id: string | null;
    entity_type: string;
    entity_id: string | null;
    action: string;
    notes: string | null;
    metadata: Record<string, unknown>;
    created_by: string | null;
    created_at: string;
  }>;
  upcoming_items: Array<{
    id: string;
    grant_id: string;
    grant_number: string;
    grant_title: string;
    item_type: 'report' | 'disbursement' | 'application';
    status: string;
    due_at: string;
    amount: number | null;
    recipient_name: string | null;
    program_name: string | null;
  }>;
};

type MockGrantDataset = {
  funders: MockGrantFunder[];
  programs: MockGrantProgram[];
  recipients: MockRecipientOrganization[];
  fundedPrograms: MockFundedProgram[];
  applications: Array<Record<string, unknown>>;
  awards: MockGrantAward[];
  reports: Array<Record<string, unknown>>;
  documents: Array<Record<string, unknown>>;
  summary: MockGrantSummary;
};

const BASE_TIMESTAMP = '2026-03-20T10:00:00.000Z';
const BASE_DATE = '2026-03-20';

const createEntity = (id: string): MockGrantEntity => ({
  id,
  organization_id: 'org-grants-smoke',
  created_by: 'staff-user-1',
  modified_by: 'staff-user-1',
  created_at: BASE_TIMESTAMP,
  updated_at: BASE_TIMESTAMP,
});

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

const groupByStatus = (awards: MockGrantAward[]): Array<{ status: string; count: number; amount: number }> => {
  const map = new Map<string, { status: string; count: number; amount: number }>();

  for (const award of awards) {
    const current = map.get(award.status) ?? {
      status: award.status,
      count: 0,
      amount: 0,
    };
    current.count += 1;
    current.amount += award.amount;
    map.set(award.status, current);
  }

  return Array.from(map.values());
};

const groupByJurisdiction = (awards: MockGrantAward[]): Array<{ status: string; count: number; amount: number }> => {
  const map = new Map<string, { status: string; count: number; amount: number }>();

  for (const award of awards) {
    const current = map.get(award.jurisdiction) ?? {
      status: award.jurisdiction,
      count: 0,
      amount: 0,
    };
    current.count += 1;
    current.amount += award.amount;
    map.set(award.jurisdiction, current);
  }

  return Array.from(map.values());
};

const createSummary = (awards: MockGrantAward[]): MockGrantSummary => {
  const awardedAmount = sum(awards.map((award) => award.amount));
  const committedAmount = sum(awards.map((award) => award.committed_amount));
  const disbursedAmount = sum(awards.map((award) => award.disbursed_amount));
  const outstandingAmount = sum(awards.map((award) => award.outstanding_amount));

  return {
    total_funders: 1,
    total_programs: 1,
    total_recipients: 1,
    total_funded_programs: 1,
    total_applications: 0,
    draft_applications: 0,
    submitted_applications: 0,
    approved_applications: 0,
    declined_applications: 0,
    total_awards: awards.length,
    active_awards: awards.filter((award) => award.status === 'active').length,
    total_awarded_amount: awardedAmount,
    committed_amount: committedAmount,
    total_disbursed_amount: disbursedAmount,
    outstanding_amount: outstandingAmount,
    overdue_reports: 1,
    upcoming_reports: awards.length,
    upcoming_disbursements: awards.length,
    by_status: groupByStatus(awards),
    by_jurisdiction: groupByJurisdiction(awards),
    recent_activity:
      awards.length === 0
        ? []
        : [
            {
              id: 'activity-1',
              organization_id: 'org-grants-smoke',
              grant_id: awards[0].id,
              entity_type: 'award',
              entity_id: awards[0].id,
              action: 'created',
              notes: `Created grant ${awards[0].grant_number}`,
              metadata: {
                grant_number: awards[0].grant_number,
                funder_id: awards[0].funder_id,
              },
              created_by: 'staff-user-1',
              created_at: BASE_TIMESTAMP,
            },
          ],
    upcoming_items:
      awards.length === 0
        ? []
        : [
            {
              id: 'calendar-1',
              grant_id: awards[0].id,
              grant_number: awards[0].grant_number,
              grant_title: awards[0].title,
              item_type: 'report',
              status: 'due',
              due_at: '2026-09-30T00:00:00.000Z',
              amount: 1000,
              recipient_name: awards[0].recipient_name,
              program_name: awards[0].program_name,
            },
          ],
  };
};

const createGrantAward = (overrides: Partial<MockGrantAward>): MockGrantAward => ({
  ...createEntity(overrides.id ?? `award-${Math.random().toString(36).slice(2, 8)}`),
  grant_number: overrides.grant_number ?? 'GR-0000',
  title: overrides.title ?? 'Grant Award',
  application_id: overrides.application_id ?? null,
  funder_id: overrides.funder_id ?? 'funder-1',
  funder_name: overrides.funder_name ?? 'Funder',
  program_id: overrides.program_id ?? 'program-1',
  program_name: overrides.program_name ?? 'Program',
  recipient_organization_id: overrides.recipient_organization_id ?? 'recipient-1',
  recipient_name: overrides.recipient_name ?? 'Recipient',
  funded_program_id: overrides.funded_program_id ?? 'funded-program-1',
  funded_program_name: overrides.funded_program_name ?? 'Funded Program',
  status: overrides.status ?? 'active',
  amount: overrides.amount ?? 0,
  committed_amount: overrides.committed_amount ?? overrides.amount ?? 0,
  disbursed_amount: overrides.disbursed_amount ?? 0,
  currency: overrides.currency ?? 'CAD',
  fiscal_year: overrides.fiscal_year ?? '2026',
  jurisdiction: overrides.jurisdiction ?? 'federal',
  award_date: overrides.award_date ?? BASE_DATE,
  start_date: overrides.start_date ?? BASE_DATE,
  end_date: overrides.end_date ?? '2026-12-31',
  expiry_date: overrides.expiry_date ?? '2026-12-31',
  reporting_frequency: overrides.reporting_frequency ?? 'annual',
  next_report_due_at: overrides.next_report_due_at ?? '2026-09-30',
  closeout_due_at: overrides.closeout_due_at ?? '2026-12-31',
  notes: overrides.notes ?? null,
  outstanding_amount:
    overrides.outstanding_amount ?? Math.max((overrides.amount ?? 0) - (overrides.disbursed_amount ?? 0), 0),
  report_count: overrides.report_count ?? 1,
  disbursement_count: overrides.disbursement_count ?? 1,
});

const createDataset = (awards: MockGrantAward[]): MockGrantDataset => {
  const funder: MockGrantFunder = {
    ...createEntity('funder-1'),
    name: 'Federal Climate Fund',
    jurisdiction: 'federal',
    funder_type: 'government',
    contact_name: 'Avery Grant',
    contact_email: 'avery@example.org',
    contact_phone: '555-0101',
    website: 'https://federal.example.org',
    notes: 'Primary federal funding stream',
    active: true,
    grant_count: awards.length,
    total_amount: sum(awards.map((award) => award.amount)),
  };

  const program: MockGrantProgram = {
    ...createEntity('program-1'),
    funder_id: funder.id,
    funder_name: funder.name,
    name: 'Community Growth Program',
    program_code: 'CGP-2026',
    fiscal_year: '2026',
    jurisdiction: 'federal',
    status: 'open',
    application_open_at: '2026-01-01',
    application_due_at: '2026-03-31',
    award_date: '2026-04-15',
    expiry_date: '2026-12-31',
    total_budget: 25000,
    notes: 'Program used for the grants smoke test',
    grant_count: awards.length,
    total_amount: sum(awards.map((award) => award.amount)),
  };

  const recipient: MockRecipientOrganization = {
    ...createEntity('recipient-1'),
    name: 'Neighbourhood House Society',
    legal_name: 'Neighbourhood House Society',
    jurisdiction: 'provincial',
    province: 'BC',
    city: 'Vancouver',
    contact_name: 'Jordan Lee',
    contact_email: 'jordan@example.org',
    contact_phone: '555-0102',
    website: 'https://recipient.example.org',
    status: 'active',
    notes: 'Recipient organization used for smoke coverage',
    active: true,
    grant_count: awards.length,
    total_amount: sum(awards.map((award) => award.amount)),
  };

  const fundedProgram: MockFundedProgram = {
    ...createEntity('funded-program-1'),
    recipient_organization_id: recipient.id,
    recipient_name: recipient.name,
    name: 'Capital Renovation Project',
    description: 'Internal funded program',
    owner_user_id: 'staff-user-1',
    owner_name: 'Smoke Tester',
    status: 'active',
    start_date: '2026-04-01',
    end_date: '2026-12-31',
    budget: 25000,
    notes: 'Linked funded program for award display',
    grant_count: awards.length,
    total_amount: sum(awards.map((award) => award.amount)),
  };

  const summary = createSummary(awards);

  return {
    funders: [funder],
    programs: [program],
    recipients: [recipient],
    fundedPrograms: [fundedProgram],
    applications: [],
    awards,
    reports: [],
    documents: [],
    summary,
  };
};

const createDefaultDataset = (): MockGrantDataset =>
  createDataset([
    createGrantAward({
      id: 'award-1',
      grant_number: 'GR-1001',
      title: 'Capital Renovation Grant',
      amount: 12500,
      committed_amount: 12500,
      disbursed_amount: 2500,
      outstanding_amount: 10000,
      program_name: 'Community Growth Program',
      recipient_name: 'Neighbourhood House Society',
      funded_program_name: 'Capital Renovation Project',
      next_report_due_at: '2026-09-30',
    }),
    createGrantAward({
      id: 'award-2',
      grant_number: 'GR-1002',
      title: 'Staff Training Grant',
      amount: 5000,
      committed_amount: 5000,
      disbursed_amount: 0,
      outstanding_amount: 5000,
      program_name: 'Community Growth Program',
      recipient_name: 'Neighbourhood House Society',
      funded_program_name: 'Capital Renovation Project',
      next_report_due_at: '2026-10-30',
    }),
  ]);

const jsonEnvelope = <T,>(data: T): string =>
  JSON.stringify({
    success: true,
    data,
  });

const installMockGrantsApi = async (page: Page, dataset: MockGrantDataset): Promise<void> => {
  await page.route('**/api/v2/grants/**', async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;

    const fulfillList = <T,>(items: T[], pageSize = 25) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: jsonEnvelope({
          data: items,
          pagination: {
            page: Number(url.searchParams.get('page') ?? '1'),
            limit: Number(url.searchParams.get('limit') ?? String(pageSize)),
            total: items.length,
            total_pages: Math.max(1, Math.ceil(items.length / Number(url.searchParams.get('limit') ?? String(pageSize)))),
          },
        }),
      });

    if (path === '/api/v2/grants/summary') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: jsonEnvelope(dataset.summary),
      });
      return;
    }

    if (path === '/api/v2/grants/funders') {
      await fulfillList(dataset.funders, 250);
      return;
    }

    if (path === '/api/v2/grants/programs') {
      await fulfillList(dataset.programs, 250);
      return;
    }

    if (path === '/api/v2/grants/recipients') {
      await fulfillList(dataset.recipients, 250);
      return;
    }

    if (path === '/api/v2/grants/funded-programs') {
      await fulfillList(dataset.fundedPrograms, 250);
      return;
    }

    if (path === '/api/v2/grants/applications') {
      await fulfillList(dataset.applications, 250);
      return;
    }

    if (path === '/api/v2/grants/awards') {
      const search = (url.searchParams.get('search') || '').trim().toLowerCase();
      const filteredAwards =
        search.length === 0
          ? dataset.awards
          : dataset.awards.filter((award) => {
              const haystack = [
                award.grant_number,
                award.title,
                award.funder_name,
                award.program_name,
                award.recipient_name,
                award.funded_program_name,
              ]
                .filter((value): value is string => typeof value === 'string')
                .join(' ')
                .toLowerCase();
              return haystack.includes(search);
            });

      await fulfillList(filteredAwards);
      return;
    }

    if (path === '/api/v2/grants/reports') {
      await fulfillList(dataset.reports, 250);
      return;
    }

    if (path === '/api/v2/grants/documents') {
      await fulfillList(dataset.documents, 250);
      return;
    }

    if (path === '/api/v2/grants/calendar') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: jsonEnvelope(dataset.summary.upcoming_items),
      });
      return;
    }

    if (path === '/api/v2/grants/activities') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: jsonEnvelope(dataset.summary.recent_activity),
      });
      return;
    }

    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        success: false,
        error: {
          code: 'unexpected_route',
          message: `Unhandled grants API request: ${route.request().method()} ${url.pathname}${url.search}`,
        },
      }),
    });
  });
};

test.describe('Grants workspace', () => {
  test('loads the internal grants workspace harness', async ({ authenticatedPage }) => {
    const dataset = createDataset([]);
    await installMockGrantsApi(authenticatedPage, dataset);

    await authenticatedPage.goto('/grants-smoke.html', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(authenticatedPage, {
      selectors: ['h1:has-text("Grants")'],
    });

    const filtersSection = authenticatedPage
      .locator('section')
      .filter({ has: authenticatedPage.getByRole('heading', { name: /filters$/i }) })
      .first();

    await expect(authenticatedPage.getByRole('heading', { name: 'Grants' })).toBeVisible();
    await expect(filtersSection.getByLabel('Search')).toBeVisible();
    await expect(filtersSection.getByLabel('Status')).toBeVisible();
    await expect(filtersSection.getByLabel('Jurisdiction')).toBeVisible();
    await expect(filtersSection.getByLabel('Page Size')).toBeVisible();
    await expect(filtersSection.getByRole('button', { name: 'Clear filters' })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Program' })).toBeVisible();
    await expect(authenticatedPage.getByRole('columnheader', { name: 'Recipient' })).toBeVisible();
  });

  test('filters awards and clears the active filters', async ({ authenticatedPage }) => {
    const dataset = createDefaultDataset();
    await installMockGrantsApi(authenticatedPage, dataset);

    await authenticatedPage.goto('/grants-smoke.html', { waitUntil: 'domcontentloaded' });
    await waitForPageReady(authenticatedPage, {
      selectors: ['h1:has-text("Grants")'],
    });

    const tableRows = authenticatedPage.locator('table tbody tr');
    const searchInput = authenticatedPage.getByLabel('Search');
    const clearFiltersButton = authenticatedPage.getByRole('button', { name: 'Clear filters' });
    const searchTerm = 'Capital Renovation Grant';

    await expect(clearFiltersButton).toBeDisabled();

    const searchRequest = authenticatedPage.waitForResponse((response) => {
      if (response.request().method() !== 'GET' || response.status() !== 200) {
        return false;
      }

      const url = new URL(response.url());
      return url.pathname.endsWith('/api/v2/grants/awards') && url.searchParams.get('search') === searchTerm;
    });

    await searchInput.fill(searchTerm);
    await searchRequest;

    await expect(tableRows.filter({ hasText: 'Capital Renovation Grant' })).toHaveCount(1, {
      timeout: 30_000,
    });
    await expect(tableRows.filter({ hasText: 'Staff Training Grant' })).toHaveCount(0, {
      timeout: 30_000,
    });
    await expect(tableRows.first()).toContainText('Community Growth Program');
    await expect(tableRows.first()).toContainText('Neighbourhood House Society');
    await expect(tableRows.first()).toContainText('Capital Renovation Grant');
    await expect(clearFiltersButton).toBeEnabled();

    const resetRequest = authenticatedPage.waitForResponse((response) => {
      if (response.request().method() !== 'GET' || response.status() !== 200) {
        return false;
      }

      const url = new URL(response.url());
      return url.pathname.endsWith('/api/v2/grants/awards') && !url.searchParams.has('search');
    });

    await clearFiltersButton.click();
    await resetRequest;

    await expect(searchInput).toHaveValue('');
    await expect(tableRows.filter({ hasText: 'Staff Training Grant' })).toHaveCount(1, {
      timeout: 30_000,
    });
    await expect(clearFiltersButton).toBeDisabled();
    await expect(authenticatedPage.getByText('Staff Training Grant')).toBeVisible();
  });
});
