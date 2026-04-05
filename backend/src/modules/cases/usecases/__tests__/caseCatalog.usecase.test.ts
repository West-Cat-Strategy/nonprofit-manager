import type { CaseCatalogPort } from '../../types/ports';
import type { CaseFilter } from '@app-types/case';
import { CaseCatalogUseCase } from '../caseCatalog.usecase';

describe('CaseCatalogUseCase', () => {
  const getCases = jest.fn();
  const getCaseById = jest.fn();
  const getCaseTimeline = jest.fn();
  const getCaseSummary = jest.fn();
  const getCaseTypes = jest.fn();
  const getCaseStatuses = jest.fn();

  const repository: CaseCatalogPort = {
    getCases,
    getCaseById,
    getCaseTimeline,
    getCaseSummary,
    getCaseTypes,
    getCaseStatuses,
  };

  beforeEach(() => {
    getCases.mockReset();
    getCaseById.mockReset();
    getCaseTimeline.mockReset();
    getCaseSummary.mockReset();
    getCaseTypes.mockReset();
    getCaseStatuses.mockReset();
  });

  it('normalizes list filters before querying the repository', async () => {
    const useCase = new CaseCatalogUseCase(repository);
    const filter: CaseFilter = {
      organizationId: ' org-1 ',
      search: ' housing support ',
      contact_id: ' contact-1 ',
      account_id: ' account-1 ',
      case_type_id: ' case-type-1 ',
      status_id: ' status-1 ',
      assigned_to: ' assignee-1 ',
      assigned_team: ' team-1 ',
      sort_by: ' created_at ',
      page: 0,
      limit: 999,
      due_within_days: -5,
      imported_only: true,
    };

    await useCase.list(filter);

    expect(getCases).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org-1',
        search: 'housing support',
        contact_id: 'contact-1',
        account_id: 'account-1',
        case_type_id: 'case-type-1',
        status_id: 'status-1',
        assigned_to: 'assignee-1',
        assigned_team: 'team-1',
        sort_by: 'created_at',
        page: 1,
        limit: 200,
        due_within_days: 0,
        imported_only: true,
      })
    );
  });

  it('normalizes case, timeline, and summary lookups', async () => {
    const useCase = new CaseCatalogUseCase(repository);

    await useCase.getById(' case-1 ', ' org-1 ');
    await useCase.timeline(' case-1 ', { limit: 999, cursor: ' cursor-1 ' }, ' org-1 ');
    await useCase.summary(' org-1 ');

    expect(getCaseById).toHaveBeenCalledWith('case-1', 'org-1');
    expect(getCaseTimeline).toHaveBeenCalledWith(
      'case-1',
      { limit: 200, cursor: 'cursor-1' },
      'org-1'
    );
    expect(getCaseSummary).toHaveBeenCalledWith('org-1');
  });
});
