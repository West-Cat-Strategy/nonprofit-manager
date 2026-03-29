import type { CaseLifecyclePort } from '../../types/ports';
import type { CreateCaseDTO, UpdateCaseDTO } from '@app-types/case';
import { CaseLifecycleUseCase } from '../caseLifecycle.usecase';

describe('CaseLifecycleUseCase', () => {
  const createCase = jest.fn();
  const updateCase = jest.fn();
  const updateCaseStatus = jest.fn();
  const reassignCase = jest.fn();
  const bulkUpdateCaseStatus = jest.fn();
  const deleteCase = jest.fn();

  const repository: CaseLifecyclePort = {
    createCase,
    updateCase,
    updateCaseStatus,
    reassignCase,
    bulkUpdateCaseStatus,
    deleteCase,
  };

  beforeEach(() => {
    createCase.mockReset();
    updateCase.mockReset();
    updateCaseStatus.mockReset();
    reassignCase.mockReset();
    bulkUpdateCaseStatus.mockReset();
    deleteCase.mockReset();
  });

  it('normalizes multi-value create payloads and mirrors the primary values', async () => {
    const useCase = new CaseLifecycleUseCase(repository);
    const input: CreateCaseDTO = {
      contact_id: ' contact-1 ',
      account_id: ' account-1 ',
      case_type_id: ' legacy-type ',
      case_type_ids: [' type-a ', 'type-b', 'type-a'],
      title: ' Need support ',
      description: ' ',
      priority: 'high',
      outcome: 'successful',
      case_outcome_values: [' unsuccessful ', 'successful', 'unsuccessful'],
      referral_source: ' Referral Partner ',
      assigned_to: ' user-1 ',
      assigned_team: ' Team 1 ',
      tags: [' alpha ', 'beta', '', 'alpha'],
    };

    createCase.mockResolvedValueOnce({ id: 'case-1' });

    await useCase.create(input, ' user-9 ');

    expect(createCase).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_id: 'contact-1',
        account_id: 'account-1',
        case_type_id: 'type-a',
        case_type_ids: ['type-a', 'type-b'],
        title: 'Need support',
        description: undefined,
        outcome: 'unsuccessful',
        case_outcome_values: ['unsuccessful', 'successful'],
        referral_source: 'Referral Partner',
        assigned_to: 'user-1',
        assigned_team: 'Team 1',
        tags: ['alpha', 'beta', 'alpha'],
      }),
      ' user-9 '
    );
  });

  it('normalizes multi-value update payloads and trims the case id', async () => {
    const useCase = new CaseLifecycleUseCase(repository);
    const input: UpdateCaseDTO = {
      case_type_id: ' legacy-type ',
      case_type_ids: [' type-a ', 'type-b', 'type-a'],
      outcome: 'referred',
      case_outcome_values: [' withdrawn ', 'referred', 'withdrawn'],
      title: ' Updated title ',
      description: ' Updated description ',
      assigned_to: ' user-2 ',
      assigned_team: ' Team 2 ',
      outcome_notes: ' Notes ',
      closure_reason: ' Reason ',
      tags: [' one ', 'two', ''],
    };

    updateCase.mockResolvedValueOnce({ id: 'case-1' });

    await useCase.update(' case-1 ', input, ' user-3 ');

    expect(updateCase).toHaveBeenCalledWith(
      'case-1',
      expect.objectContaining({
        case_type_id: 'type-a',
        case_type_ids: ['type-a', 'type-b'],
        outcome: 'withdrawn',
        case_outcome_values: ['withdrawn', 'referred'],
        title: 'Updated title',
        description: 'Updated description',
        assigned_to: 'user-2',
        assigned_team: 'Team 2',
        outcome_notes: 'Notes',
        closure_reason: 'Reason',
        tags: ['one', 'two'],
      }),
      ' user-3 '
    );
  });
});
