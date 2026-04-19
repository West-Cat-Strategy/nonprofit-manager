import { useCallback, useMemo, useState } from 'react';
import type { AppDispatch } from '../../../store';
import { confirmPresets, type ConfirmOptions } from '../../../hooks/useConfirmDialog';
import type { CaseMilestone } from '../../../types/case';
import {
  createCaseMilestone,
  deleteCaseMilestone,
  fetchCaseMilestones,
  updateCaseMilestone,
} from '../state';

interface UseCaseMilestonesArgs {
  caseId?: string;
  caseMilestones: CaseMilestone[];
  dispatch: AppDispatch;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
}

export function useCaseMilestones({
  caseId,
  caseMilestones,
  dispatch,
  confirm,
  showSuccess,
  showError,
}: UseCaseMilestonesArgs) {
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<CaseMilestone | null>(null);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [milestoneCompleted, setMilestoneCompleted] = useState(false);

  const completedMilestones = useMemo(
    () => caseMilestones.filter((milestone) => milestone.is_completed).length,
    [caseMilestones]
  );

  const resetMilestoneForm = useCallback(() => {
    setShowMilestoneForm(false);
    setEditingMilestone(null);
    setMilestoneName('');
    setMilestoneDescription('');
    setMilestoneDueDate('');
    setMilestoneCompleted(false);
  }, []);

  const refreshMilestones = useCallback(() => {
    if (!caseId) {
      return;
    }

    dispatch(fetchCaseMilestones(caseId));
  }, [caseId, dispatch]);

  const handleSaveMilestone = useCallback(async () => {
    if (!caseId || !milestoneName.trim()) {
      return;
    }

    try {
      if (editingMilestone) {
        await dispatch(
          updateCaseMilestone({
            milestoneId: editingMilestone.id,
            data: {
              milestone_name: milestoneName,
              description: milestoneDescription || undefined,
              due_date: milestoneDueDate || undefined,
              is_completed: milestoneCompleted,
            },
          })
        ).unwrap();
        showSuccess('Milestone updated');
      } else {
        await dispatch(
          createCaseMilestone({
            caseId,
            data: {
              milestone_name: milestoneName,
              description: milestoneDescription || undefined,
              due_date: milestoneDueDate || undefined,
            },
          })
        ).unwrap();
        showSuccess('Milestone created');
      }

      resetMilestoneForm();
      refreshMilestones();
    } catch (error) {
      console.error('Failed to save milestone:', error);
      showError('Failed to save milestone');
    }
  }, [
    caseId,
    dispatch,
    editingMilestone,
    milestoneCompleted,
    milestoneDescription,
    milestoneDueDate,
    milestoneName,
    refreshMilestones,
    resetMilestoneForm,
    showError,
    showSuccess,
  ]);

  const handleEditMilestone = useCallback((milestone: CaseMilestone) => {
    setEditingMilestone(milestone);
    setMilestoneName(milestone.milestone_name);
    setMilestoneDescription(milestone.description || '');
    setMilestoneDueDate(milestone.due_date ? milestone.due_date.split('T')[0] : '');
    setMilestoneCompleted(milestone.is_completed);
    setShowMilestoneForm(true);
  }, []);

  const handleDeleteMilestone = useCallback(
    async (milestoneId: string) => {
      if (!caseId) {
        return;
      }

      const confirmed = await confirm(confirmPresets.delete('Milestone'));
      if (!confirmed) {
        return;
      }

      try {
        await dispatch(deleteCaseMilestone(milestoneId)).unwrap();
        showSuccess('Milestone deleted');
        refreshMilestones();
      } catch (error) {
        console.error('Failed to delete milestone:', error);
        showError('Failed to delete milestone');
      }
    },
    [caseId, confirm, dispatch, refreshMilestones, showError, showSuccess]
  );

  const handleToggleMilestoneComplete = useCallback(
    async (milestone: CaseMilestone) => {
      if (!caseId) {
        return;
      }

      try {
        await dispatch(
          updateCaseMilestone({
            milestoneId: milestone.id,
            data: { is_completed: !milestone.is_completed },
          })
        ).unwrap();
        refreshMilestones();
      } catch (error) {
        console.error('Failed to toggle milestone:', error);
        showError('Failed to update milestone');
      }
    },
    [caseId, dispatch, refreshMilestones, showError]
  );

  return {
    showMilestoneForm,
    setShowMilestoneForm,
    editingMilestone,
    milestoneName,
    setMilestoneName,
    milestoneDescription,
    setMilestoneDescription,
    milestoneDueDate,
    setMilestoneDueDate,
    milestoneCompleted,
    setMilestoneCompleted,
    completedMilestones,
    resetMilestoneForm,
    handleSaveMilestone,
    handleEditMilestone,
    handleDeleteMilestone,
    handleToggleMilestoneComplete,
  };
}
