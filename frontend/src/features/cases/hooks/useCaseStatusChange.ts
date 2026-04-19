import { useCallback, useMemo, useState } from 'react';
import type { AppDispatch } from '../../../store';
import type { CaseStatus } from '../../../types/case';
import { updateCaseStatus } from '../state';

interface UseCaseStatusChangeArgs {
  caseId?: string;
  caseStatuses: CaseStatus[];
  dispatch: AppDispatch;
  onStatusUpdated: () => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export function useCaseStatusChange({
  caseId,
  caseStatuses,
  dispatch,
  onStatusUpdated,
  showSuccess,
  showError,
}: UseCaseStatusChangeArgs) {
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [newStatusId, setNewStatusId] = useState('');
  const [statusChangeNotes, setStatusChangeNotes] = useState('');
  const [statusOutcomeDefinitionIds, setStatusOutcomeDefinitionIds] = useState<string[]>([]);
  const [statusOutcomeVisibility, setStatusOutcomeVisibility] = useState(false);

  const selectedStatusDefinition = useMemo(
    () => caseStatuses.find((status) => status.id === newStatusId),
    [caseStatuses, newStatusId]
  );

  const selectedStatusRequiresOutcome =
    selectedStatusDefinition?.status_type === 'review' ||
    selectedStatusDefinition?.status_type === 'closed' ||
    selectedStatusDefinition?.status_type === 'cancelled';

  const closeStatusChangeModal = useCallback(() => {
    setIsChangingStatus(false);
    setNewStatusId('');
    setStatusChangeNotes('');
    setStatusOutcomeDefinitionIds([]);
    setStatusOutcomeVisibility(false);
  }, []);

  const handleStatusChange = useCallback(async () => {
    if (!caseId || !newStatusId) {
      return;
    }

    if (!statusChangeNotes.trim()) {
      showError('Status change notes are required');
      return;
    }

    if (selectedStatusRequiresOutcome && statusOutcomeDefinitionIds.length === 0) {
      showError('Select at least one outcome for this status change');
      return;
    }

    try {
      await dispatch(
        updateCaseStatus({
          id: caseId,
          data: {
            new_status_id: newStatusId,
            notes: statusChangeNotes.trim(),
            outcome_definition_ids: selectedStatusRequiresOutcome
              ? statusOutcomeDefinitionIds
              : undefined,
            outcome_visibility: selectedStatusRequiresOutcome
              ? statusOutcomeVisibility
              : undefined,
          },
        })
      ).unwrap();
      showSuccess('Status updated successfully');
      closeStatusChangeModal();
      onStatusUpdated();
    } catch (error) {
      console.error('Failed to update status:', error);
      showError('Failed to update status');
    }
  }, [
    caseId,
    closeStatusChangeModal,
    dispatch,
    newStatusId,
    onStatusUpdated,
    selectedStatusRequiresOutcome,
    showError,
    showSuccess,
    statusChangeNotes,
    statusOutcomeDefinitionIds,
    statusOutcomeVisibility,
  ]);

  return {
    isChangingStatus,
    setIsChangingStatus,
    newStatusId,
    setNewStatusId,
    statusChangeNotes,
    setStatusChangeNotes,
    statusOutcomeDefinitionIds,
    setStatusOutcomeDefinitionIds,
    statusOutcomeVisibility,
    setStatusOutcomeVisibility,
    selectedStatusRequiresOutcome,
    closeStatusChangeModal,
    handleStatusChange,
  };
}
