import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import CaseStatusChangeModal from '../CaseStatusChangeModal';
import type { CaseStatus } from '../../../../types/case';
import type { OutcomeDefinition } from '../../../../types/outcomes';

const caseStatuses: CaseStatus[] = [
  {
    id: 'status-active',
    name: 'Active',
    status_type: 'active',
    description: null,
    color: null,
    sort_order: 1,
    is_active: true,
    can_transition_to: null,
    requires_reason: false,
    created_at: '2026-04-18T00:00:00.000Z',
    updated_at: '2026-04-18T00:00:00.000Z',
  },
  {
    id: 'status-closed',
    name: 'Closed',
    status_type: 'closed',
    description: null,
    color: null,
    sort_order: 2,
    is_active: true,
    can_transition_to: null,
    requires_reason: true,
    created_at: '2026-04-18T00:00:00.000Z',
    updated_at: '2026-04-18T00:00:00.000Z',
  },
];

const outcomeDefinitions: OutcomeDefinition[] = [
  {
    id: 'outcome-1',
    key: 'housing-stabilized',
    name: 'Housing Stabilized',
    description: null,
    category: 'housing',
    is_active: true,
    is_reportable: true,
    sort_order: 1,
    created_at: '2026-04-18T00:00:00.000Z',
    updated_at: '2026-04-18T00:00:00.000Z',
  },
];

describe('CaseStatusChangeModal', () => {
  it('requires notes and outcomes for outcome-bearing status changes', () => {
    const onNewStatusIdChange = vi.fn();
    const onNotesChange = vi.fn();
    const onOutcomeDefinitionIdsChange = vi.fn();
    const onOutcomeVisibilityChange = vi.fn();
    const onCancel = vi.fn();
    const onSubmit = vi.fn();

    render(
      <CaseStatusChangeModal
        open
        loading={false}
        caseStatuses={caseStatuses}
        newStatusId="status-closed"
        notes=""
        outcomeDefinitionIds={[]}
        outcomeVisibility={false}
        requiresOutcome
        outcomeDefinitions={outcomeDefinitions}
        onNewStatusIdChange={onNewStatusIdChange}
        onNotesChange={onNotesChange}
        onOutcomeDefinitionIdsChange={onOutcomeDefinitionIdsChange}
        onOutcomeVisibilityChange={onOutcomeVisibilityChange}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByRole('heading', { name: /change case status/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update status/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Select new status'), {
      target: { value: 'status-active' },
    });
    fireEvent.change(screen.getByPlaceholderText(/reason for status change/i), {
      target: { value: 'Closed after completing the service plan.' },
    });
    fireEvent.click(screen.getByLabelText(/visible to client/i));
    fireEvent.click(screen.getByLabelText(/housing stabilized/i));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onNewStatusIdChange).toHaveBeenCalledWith('status-active');
    expect(onNotesChange).toHaveBeenCalledWith('Closed after completing the service plan.');
    expect(onOutcomeVisibilityChange).toHaveBeenCalledWith(true);
    expect(onOutcomeDefinitionIdsChange).toHaveBeenCalledWith(['outcome-1']);
    expect(onCancel).toHaveBeenCalled();
  });
});
