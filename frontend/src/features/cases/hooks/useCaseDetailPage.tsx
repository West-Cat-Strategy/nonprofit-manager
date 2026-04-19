import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  clearCurrentCase,
  deleteCase,
  fetchCaseById,
  fetchCaseMilestones,
  fetchCaseOutcomeDefinitions,
  fetchCaseStatuses,
  updateCase,
} from '../state';
import { useToast } from '../../../contexts/useToast';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';
import type { CaseMilestone, CaseStatus, CaseStatusType, CaseWithDetails } from '../../../types/case';
import type { OutcomeDefinition } from '../../../types/outcomes';
import { isUuid } from '../../../utils/uuid';
import { formatCaseOutcomeLabel, summarizeLabels } from '../utils/caseClassification';
import { useCaseMilestones } from './useCaseMilestones';
import { useCaseStatusChange } from './useCaseStatusChange';

export type CaseDetailTab =
  | 'overview'
  | 'timeline'
  | 'notes'
  | 'forms'
  | 'outcomes_topics'
  | 'documents'
  | 'milestones'
  | 'followups'
  | 'relationships'
  | 'services'
  | 'team_chat'
  | 'portal'
  | 'appointments';

type CaseTabConfig = {
  key: CaseDetailTab;
  label: string;
  count?: number;
};

type CaseDetailState = {
  core?: {
    currentCase?: CaseWithDetails | null;
    caseStatuses?: CaseStatus[];
    loading?: boolean;
    error?: string | null;
  };
  currentCase?: CaseWithDetails | null;
  caseStatuses?: CaseStatus[];
  loading?: boolean;
  error?: string | null;
  management?: {
    milestones?: CaseMilestone[];
  };
  caseMilestones?: CaseMilestone[];
  notes?: {
    outcomeDefinitions?: OutcomeDefinition[];
  };
  caseOutcomeDefinitions?: OutcomeDefinition[];
};

const teamChatEnabled = import.meta.env.VITE_TEAM_CHAT_ENABLED !== 'false';
const validTabs: CaseDetailTab[] = [
  'overview',
  'timeline',
  'notes',
  'forms',
  'outcomes_topics',
  'documents',
  'milestones',
  'followups',
  'relationships',
  'services',
  'team_chat',
  'portal',
  'appointments',
];

const resolveTab = (requestedTab: string | null): CaseDetailTab => {
  if (!requestedTab) return 'overview';
  if (!validTabs.includes(requestedTab as CaseDetailTab)) return 'overview';
  if (requestedTab === 'team_chat' && !teamChatEnabled) return 'overview';
  return requestedTab as CaseDetailTab;
};

const getProgressWidthClass = (value: number): string => {
  if (value <= 0) return 'w-0';
  if (value < 12.5) return 'w-1/12';
  if (value < 25) return 'w-1/4';
  if (value < 37.5) return 'w-1/3';
  if (value < 50) return 'w-1/2';
  if (value < 62.5) return 'w-7/12';
  if (value < 75) return 'w-3/4';
  if (value < 87.5) return 'w-10/12';
  return 'w-full';
};

export const useCaseDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const hasValidId = isUuid(id);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const { currentCase, caseStatuses, loading, error } = useAppSelector((state) => {
    const casesModule = state.cases as CaseDetailState;
    const core = casesModule?.core ?? {};
    return {
      currentCase: core.currentCase ?? casesModule?.currentCase ?? null,
      caseStatuses: core.caseStatuses ?? casesModule?.caseStatuses ?? [],
      loading: core.loading ?? casesModule?.loading ?? false,
      error: core.error ?? casesModule?.error ?? null,
    };
  });
  const { milestones: caseMilestones } = useAppSelector((state) => {
    const casesModule = state.cases as CaseDetailState;
    const management = casesModule?.management ?? {};
    return {
      milestones: management.milestones ?? casesModule?.caseMilestones ?? [],
    };
  });
  const { outcomeDefinitions: caseOutcomeDefinitions } = useAppSelector((state) => {
    const casesModule = state.cases as CaseDetailState;
    const notes = casesModule?.notes ?? {};
    return {
      outcomeDefinitions: notes.outcomeDefinitions ?? casesModule?.caseOutcomeDefinitions ?? [],
    };
  });
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const requestedTab = searchParams.get('tab');
  const initialTab: CaseDetailTab = resolveTab(requestedTab);
  const [activeTab, setActiveTab] = useState<CaseDetailTab>(initialTab);
  const [timelineRefreshKey, setTimelineRefreshKey] = useState(0);

  useEffect(() => {
    if (!hasValidId || !id) {
      return;
    }

    dispatch(fetchCaseById(id));
    dispatch(fetchCaseStatuses());
    dispatch(fetchCaseMilestones(id));
    dispatch(fetchCaseOutcomeDefinitions(false));
  }, [dispatch, hasValidId, id]);

  useEffect(() => {
    return () => {
      dispatch(clearCurrentCase());
    };
  }, [dispatch]);

  useEffect(() => {
    const nextTab = resolveTab(requestedTab);
    setActiveTab((current) => (current === nextTab ? current : nextTab));
  }, [requestedTab]);

  const activeOutcomeDefinitions = useMemo(
    () => (caseOutcomeDefinitions || []).filter((definition: OutcomeDefinition) => definition.is_active),
    [caseOutcomeDefinitions]
  );

  const caseTypeLabels = useMemo(
    () =>
      summarizeLabels(
        currentCase?.case_type_names?.length
          ? currentCase.case_type_names
          : currentCase?.case_type_name
            ? [currentCase.case_type_name]
            : [],
        3
      ),
    [currentCase]
  );

  const caseOutcomeLabels = useMemo(
    () =>
      summarizeLabels(
        currentCase?.case_outcome_values?.length
          ? currentCase.case_outcome_values.map((value) => formatCaseOutcomeLabel(value))
          : currentCase?.outcome
            ? [formatCaseOutcomeLabel(currentCase.outcome)]
            : [],
        3
      ),
    [currentCase]
  );

  const caseProvenance = currentCase?.provenance ?? null;

  const tabs = useMemo<Array<CaseTabConfig>>(() => {
    if (!currentCase) {
      return [];
    }

    return [
      { key: 'overview', label: 'Overview' },
      { key: 'timeline', label: 'Timeline' },
      { key: 'notes', label: 'Notes', count: currentCase.notes_count || 0 },
      { key: 'forms', label: 'Forms' },
      { key: 'outcomes_topics', label: 'Outcomes + Topics' },
      { key: 'documents', label: 'Documents', count: currentCase.documents_count || 0 },
      { key: 'milestones', label: 'Milestones', count: caseMilestones.length },
      { key: 'relationships', label: 'Relationships' },
      { key: 'services', label: 'Services', count: currentCase.services_count || 0 },
      ...(teamChatEnabled ? [{ key: 'team_chat' as CaseDetailTab, label: 'Case Chat' }] : []),
      { key: 'portal', label: 'Portal' },
      { key: 'appointments', label: 'Appointments' },
      { key: 'followups', label: 'Follow-ups' },
    ];
  }, [caseMilestones.length, currentCase]);

  const handleNavigateBack = useCallback(() => {
    navigate('/cases');
  }, [navigate]);

  const handleNavigateEdit = useCallback(() => {
    if (!id) {
      return;
    }

    navigate(`/cases/${id}/edit`);
  }, [id, navigate]);

  const setActiveTabWithUrl = useCallback(
    (tab: CaseDetailTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams);
      if (tab === 'overview') {
        params.delete('tab');
      } else {
        params.set('tab', tab);
      }
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const refreshCaseArtifacts = useCallback(() => {
    if (!id) {
      return;
    }

    dispatch(fetchCaseById(id));
    setTimelineRefreshKey((value) => value + 1);
  }, [dispatch, id]);

  const {
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
  } = useCaseStatusChange({
    caseId: id,
    caseStatuses,
    dispatch,
    onStatusUpdated: refreshCaseArtifacts,
    showSuccess,
    showError,
  });

  const {
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
  } = useCaseMilestones({
    caseId: id,
    caseMilestones,
    dispatch,
    confirm,
    showSuccess,
    showError,
  });

  const handleToggleClientViewable = useCallback(async () => {
    if (!id || !currentCase) return;

    try {
      await dispatch(
        updateCase({
          id,
          data: {
            client_viewable: !currentCase.client_viewable,
          },
        })
      ).unwrap();
      dispatch(fetchCaseById(id));
      showSuccess(
        !currentCase.client_viewable
          ? 'Case is now visible in client portal'
          : 'Case is now hidden from client portal'
      );
    } catch (err) {
      console.error('Failed to update client visibility:', err);
      showError('Failed to update client visibility');
    }
  }, [currentCase, dispatch, id, showError, showSuccess]);

  const handleDelete = useCallback(async () => {
    if (!id) return;
    const confirmed = await confirm(confirmPresets.delete('Case'));
    if (!confirmed) return;

    try {
      await dispatch(deleteCase(id)).unwrap();
      showSuccess('Case deleted successfully');
      navigate('/cases');
    } catch (err) {
      console.error('Failed to delete case:', err);
      showError('Failed to delete case');
    }
  }, [confirm, dispatch, id, navigate, showError, showSuccess]);

  const getStatusTypeBadgeColor = useCallback(
    (statusType?: CaseStatusType): 'purple' | 'green' | 'yellow' | 'gray' | 'red' => {
      if (!statusType) return 'gray';
      const colors: Record<CaseStatusType, 'purple' | 'green' | 'yellow' | 'gray' | 'red'> = {
        intake: 'purple',
        active: 'green',
        review: 'yellow',
        closed: 'gray',
        cancelled: 'red',
      };
      return colors[statusType];
    },
    []
  );

  const handleOpenNotes = useCallback(() => setActiveTabWithUrl('notes'), [setActiveTabWithUrl]);
  const handleOpenDocuments = useCallback(() => setActiveTabWithUrl('documents'), [setActiveTabWithUrl]);

  return {
    id,
    hasValidId,
    currentCase,
    caseStatuses,
    loading,
    error,
    caseMilestones,
    dialogState,
    handleConfirm,
    handleCancel,
    activeTab,
    setActiveTab,
    setActiveTabWithUrl,
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
    timelineRefreshKey,
    caseTypeLabels,
    caseOutcomeLabels,
    caseProvenance,
    activeOutcomeDefinitions,
    selectedStatusRequiresOutcome,
    tabs,
    completedMilestones,
    getProgressWidthClass,
    getStatusTypeBadgeColor,
    handleNavigateBack,
    handleNavigateEdit,
    handleOpenNotes,
    handleOpenDocuments,
    handleToggleClientViewable,
    handleDelete,
    closeStatusChangeModal,
    resetMilestoneForm,
    handleStatusChange,
    handleEditMilestone,
    handleSaveMilestone,
    handleDeleteMilestone,
    handleToggleMilestoneComplete,
    refreshCaseArtifacts,
  };
};
