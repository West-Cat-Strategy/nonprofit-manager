import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grantsApiClient } from '../../api/grantsApiClient';
import {
  getGrantsSectionAdapter,
  getSectionFromPath,
  isEditableGrantsSection,
} from '../grantsSectionAdapters';

vi.mock('../../api/grantsApiClient', () => ({
  grantsApiClient: {
    listFunders: vi.fn(),
    getCalendar: vi.fn(),
    createFunder: vi.fn(),
    updateFunder: vi.fn(),
    deleteFunder: vi.fn(),
  },
}));

describe('grantsSectionAdapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps routes to section ids and loads read-only calendar rows through the section adapter', async () => {
    vi.mocked(grantsApiClient.getCalendar).mockResolvedValueOnce([
      { id: 'cal-1', title: 'Grant report due' },
    ] as never);

    const adapter = getGrantsSectionAdapter(getSectionFromPath('/grants/calendar/'));
    const result = await adapter.loadRows({
      due_after: '2026-04-01',
      due_before: '2026-04-30',
      limit: 10,
    });

    expect(adapter.readOnly).toBe(true);
    expect(grantsApiClient.getCalendar).toHaveBeenCalledWith({
      start_date: '2026-04-01',
      end_date: '2026-04-30',
      limit: 10,
    });
    expect(result.pagination).toBeNull();
    expect(result.rows).toEqual([{ id: 'cal-1', title: 'Grant report due' }]);
  });

  it('routes editable section saves through the configured section adapter', async () => {
    vi.mocked(grantsApiClient.createFunder).mockResolvedValueOnce({ id: 'funder-1' } as never);
    vi.mocked(grantsApiClient.updateFunder).mockResolvedValueOnce({ id: 'funder-1' } as never);

    const adapter = getGrantsSectionAdapter('funders');
    expect(isEditableGrantsSection(adapter)).toBe(true);
    if (!isEditableGrantsSection(adapter)) {
      return;
    }

    await expect(
      adapter.saveRecord({
        selectedId: null,
        formValues: {
          name: 'Alpha Funder',
          jurisdiction: 'federal',
          active: 'true',
        },
        lookups: {
          funders: [],
          programs: [],
          recipients: [],
          fundedPrograms: [],
          applications: [],
          awards: [],
          reports: [],
          documents: [],
        },
      })
    ).resolves.toBe('Funder created.');

    await expect(
      adapter.saveRecord({
        selectedId: 'funder-1',
        formValues: {
          name: 'Updated Funder',
          jurisdiction: 'provincial',
          active: 'false',
        },
        lookups: {
          funders: [],
          programs: [],
          recipients: [],
          fundedPrograms: [],
          applications: [],
          awards: [],
          reports: [],
          documents: [],
        },
      })
    ).resolves.toBe('Funder updated.');

    expect(grantsApiClient.createFunder).toHaveBeenCalledWith({
      name: 'Alpha Funder',
      jurisdiction: 'federal',
      funder_type: null,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      website: null,
      notes: null,
      active: true,
    });
    expect(grantsApiClient.updateFunder).toHaveBeenCalledWith('funder-1', {
      name: 'Updated Funder',
      jurisdiction: 'provincial',
      funder_type: null,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      website: null,
      notes: null,
      active: false,
    });
  });
});
