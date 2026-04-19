import { useCallback, useState } from 'react';
import type { AppDispatch } from '../../../store';
import type { CaseFilter } from '../../../types/case';
import { bulkUpdateCaseStatus, fetchCases, fetchCaseSummary } from '../state';

interface UseCaseBulkStatusArgs {
  dispatch: AppDispatch;
  filters: CaseFilter;
  selectedCaseIds: string[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export function useCaseBulkStatus({
  dispatch,
  filters,
  selectedCaseIds,
  showSuccess,
  showError,
}: UseCaseBulkStatusArgs) {
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkStatusId, setBulkStatusId] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');

  const handleBulkStatusUpdate = useCallback(async () => {
    if (!bulkStatusId || selectedCaseIds.length === 0) {
      return;
    }

    try {
      await dispatch(
        bulkUpdateCaseStatus({
          case_ids: selectedCaseIds,
          new_status_id: bulkStatusId,
          notes: bulkNotes || undefined,
        })
      ).unwrap();
      showSuccess(`Updated ${selectedCaseIds.length} cases`);
      setShowBulkModal(false);
      setBulkStatusId('');
      setBulkNotes('');
      dispatch(fetchCases(filters));
      dispatch(fetchCaseSummary());
    } catch {
      showError('Failed to update cases');
    }
  }, [
    bulkNotes,
    bulkStatusId,
    dispatch,
    filters,
    selectedCaseIds,
    showError,
    showSuccess,
  ]);

  return {
    showBulkModal,
    setShowBulkModal,
    bulkStatusId,
    setBulkStatusId,
    bulkNotes,
    setBulkNotes,
    handleBulkStatusUpdate,
  };
}
