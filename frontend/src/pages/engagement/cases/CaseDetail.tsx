/**
 * CaseDetail Page
 * Displays detailed information about a single case with neo-brutalist styling
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  fetchCaseById,
  fetchCaseNotes,
  updateCaseStatus,
  deleteCase,
  clearCurrentCase,
  fetchCaseStatuses,
  fetchCaseMilestones,
  createCaseMilestone,
  updateCaseMilestone,
  deleteCaseMilestone,
} from '../../../features/cases/state';
import { useToast } from '../../../contexts/useToast';
import { BrutalBadge, BrutalButton, BrutalCard, NeoBrutalistLayout } from '../../../components/neo-brutalist';
import CaseNotes from '../../../components/CaseNotes';
import CaseDocuments from '../../../components/CaseDocuments';
import FollowUpList from '../../../components/FollowUpList';
import CaseRelationships from '../../../components/cases/CaseRelationships';
import CaseServices from '../../../components/cases/CaseServices';
import CasePortalConversations from '../../../components/cases/CasePortalConversations';
import type { CasePriority, CaseStatusType, CaseMilestone } from '../../../types/case';
import ConfirmDialog from '../../../components/ConfirmDialog';
import useConfirmDialog, { confirmPresets } from '../../../hooks/useConfirmDialog';

type TabType =
  | 'overview'
  | 'notes'
  | 'documents'
  | 'milestones'
  | 'followups'
  | 'relationships'
  | 'services'
  | 'portal';

const CaseDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showSuccess, showError } = useToast();
  const { currentCase, caseStatuses, caseMilestones, loading, error } = useAppSelector((state) => state.casesV2);
  const { dialogState, confirm, handleConfirm, handleCancel } = useConfirmDialog();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [newStatusId, setNewStatusId] = useState('');
  const [statusChangeNotes, setStatusChangeNotes] = useState('');

  // Milestone form state
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<CaseMilestone | null>(null);
  const [milestoneName, setMilestoneName] = useState('');
  const [milestoneDescription, setMilestoneDescription] = useState('');
  const [milestoneDueDate, setMilestoneDueDate] = useState('');
  const [milestoneCompleted, setMilestoneCompleted] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchCaseById(id));
      dispatch(fetchCaseNotes(id));
      dispatch(fetchCaseStatuses());
      dispatch(fetchCaseMilestones(id));
    }

    return () => {
      dispatch(clearCurrentCase());
    };
  }, [dispatch, id]);

  const handleStatusChange = async () => {
    if (!id || !newStatusId) return;

    try {
      await dispatch(
        updateCaseStatus({
          id,
          data: {
            new_status_id: newStatusId,
            notes: statusChangeNotes,
          },
        })
      ).unwrap();

      showSuccess('Status updated successfully');
      setIsChangingStatus(false);
      setNewStatusId('');
      setStatusChangeNotes('');
      dispatch(fetchCaseNotes(id));
    } catch (err) {
      console.error('Failed to update status:', err);
      showError('Failed to update status');
    }
  };

  const resetMilestoneForm = () => {
    setShowMilestoneForm(false);
    setEditingMilestone(null);
    setMilestoneName('');
    setMilestoneDescription('');
    setMilestoneDueDate('');
    setMilestoneCompleted(false);
  };

  const handleEditMilestone = (milestone: CaseMilestone) => {
    setEditingMilestone(milestone);
    setMilestoneName(milestone.milestone_name);
    setMilestoneDescription(milestone.description || '');
    setMilestoneDueDate(milestone.due_date ? milestone.due_date.split('T')[0] : '');
    setMilestoneCompleted(milestone.is_completed);
    setShowMilestoneForm(true);
  };

  const handleSaveMilestone = async () => {
    if (!id || !milestoneName.trim()) return;

    try {
      if (editingMilestone) {
        await dispatch(updateCaseMilestone({
          milestoneId: editingMilestone.id,
          data: {
            milestone_name: milestoneName,
            description: milestoneDescription || undefined,
            due_date: milestoneDueDate || undefined,
            is_completed: milestoneCompleted,
          },
        })).unwrap();
        showSuccess('Milestone updated');
      } else {
        await dispatch(createCaseMilestone({
          caseId: id,
          data: {
            milestone_name: milestoneName,
            description: milestoneDescription || undefined,
            due_date: milestoneDueDate || undefined,
          },
        })).unwrap();
        showSuccess('Milestone created');
      }
      resetMilestoneForm();
      dispatch(fetchCaseMilestones(id));
    } catch (err) {
      console.error('Failed to save milestone:', err);
      showError('Failed to save milestone');
    }
  };

  const handleDeleteMilestone = async (milestoneId: string) => {
    if (!id) return;
    const confirmed = await confirm(confirmPresets.delete('Milestone'));
    if (!confirmed) return;
    try {
      await dispatch(deleteCaseMilestone(milestoneId)).unwrap();
      showSuccess('Milestone deleted');
      dispatch(fetchCaseMilestones(id));
    } catch (err) {
      console.error('Failed to delete milestone:', err);
      showError('Failed to delete milestone');
    }
  };

  const handleToggleMilestoneComplete = async (milestone: CaseMilestone) => {
    if (!id) return;
    try {
      await dispatch(updateCaseMilestone({
        milestoneId: milestone.id,
        data: { is_completed: !milestone.is_completed },
      })).unwrap();
      dispatch(fetchCaseMilestones(id));
    } catch (err) {
      console.error('Failed to toggle milestone:', err);
      showError('Failed to update milestone');
    }
  };

  const getMilestoneStatusColor = (isCompleted: boolean): 'green' | 'gray' => {
    return isCompleted ? 'green' : 'gray';
  };

  const handleDelete = async () => {
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
  };

  const getPriorityBadgeColor = (priority: CasePriority): 'gray' | 'blue' | 'yellow' | 'red' => {
    const colors: Record<CasePriority, 'gray' | 'blue' | 'yellow' | 'red'> = {
      low: 'gray',
      medium: 'blue',
      high: 'yellow',
      urgent: 'red',
    };
    return colors[priority];
  };

  const getStatusTypeBadgeColor = (
    statusType?: CaseStatusType
  ): 'purple' | 'green' | 'yellow' | 'gray' | 'red' => {
    if (!statusType) return 'gray';
    const colors: Record<CaseStatusType, 'purple' | 'green' | 'yellow' | 'gray' | 'red'> = {
      intake: 'purple',
      active: 'green',
      review: 'yellow',
      closed: 'gray',
      cancelled: 'red',
    };
    return colors[statusType];
  };

  if (loading && !currentCase) {
    return (
      <NeoBrutalistLayout pageTitle="Case Details">
        <div className="p-6">
          <BrutalCard color="white" className="p-12">
            <div className="flex flex-col items-center justify-center">
              <div className="animate-spin h-12 w-12 border-4 border-black border-t-transparent mb-4" />
              <p className="font-bold text-black">Loading case...</p>
            </div>
          </BrutalCard>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (error) {
    return (
      <NeoBrutalistLayout pageTitle="Case Details">
        <div className="p-6">
          <BrutalCard color="pink" className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-black uppercase text-black mb-2">Error</h2>
              <p className="font-bold text-black/70 mb-4">{error}</p>
              <BrutalButton onClick={() => navigate('/cases')} variant="secondary">
                Back to Cases
              </BrutalButton>
            </div>
          </BrutalCard>
        </div>
      </NeoBrutalistLayout>
    );
  }

  if (!currentCase) {
    return (
      <NeoBrutalistLayout pageTitle="Case Details">
        <div className="p-6">
          <BrutalCard color="yellow" className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-4">🔍</div>
              <h2 className="text-xl font-black uppercase text-black mb-2">Case Not Found</h2>
              <p className="font-bold text-black/70 mb-4">
                The case you're looking for doesn't exist or has been removed.
              </p>
              <BrutalButton onClick={() => navigate('/cases')} variant="primary">
                Back to Cases
              </BrutalButton>
            </div>
          </BrutalCard>
        </div>
      </NeoBrutalistLayout>
    );
  }

  const completedMilestones = caseMilestones.filter(m => m.is_completed).length;

  const tabs: Array<{ key: TabType; label: string; count?: number }> = [
    { key: 'overview', label: 'Overview' },
    { key: 'notes', label: 'Notes', count: currentCase.notes_count || 0 },
    { key: 'documents', label: 'Documents', count: currentCase.documents_count || 0 },
    { key: 'milestones', label: 'Milestones', count: caseMilestones.length },
    { key: 'relationships', label: 'Relationships' },
    { key: 'services', label: 'Services', count: currentCase.services_count || 0 },
    { key: 'portal', label: 'Portal' },
    { key: 'followups', label: 'Follow-ups' },
  ];

  return (
    <NeoBrutalistLayout pageTitle="Case Details">
      <div className="p-6 space-y-6">
        {/* Header */}
        <BrutalCard color="yellow" className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <button
                onClick={() => navigate('/cases')}
                className="text-sm font-black uppercase text-black/70 hover:text-black mb-2 flex items-center gap-1"
                aria-label="Back to cases"
              >
                ← Back to Cases
              </button>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                  {currentCase.case_number}
                </h1>
                {currentCase.is_urgent && (
                  <span className="px-3 py-1 bg-red-500 text-white text-sm font-black rounded-none border-2 border-black">
                    ⚠️ URGENT
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-black">{currentCase.title}</h2>
            </div>
            <div className="flex gap-2">
              <BrutalButton onClick={() => navigate(`/cases/${id}/edit`)} variant="secondary">
                Edit
              </BrutalButton>
              <BrutalButton onClick={handleDelete} variant="danger">
                Delete
              </BrutalButton>
            </div>
          </div>
        </BrutalCard>

        {/* Status Bar */}
        <BrutalCard color="white" className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <div className="text-xs font-black uppercase text-black/70 mb-1">Status</div>
                <BrutalBadge color={getStatusTypeBadgeColor(currentCase.status_type)}>
                  {currentCase.status_name}
                </BrutalBadge>
              </div>
              <div>
                <div className="text-xs font-black uppercase text-black/70 mb-1">Priority</div>
                <BrutalBadge color={getPriorityBadgeColor(currentCase.priority)}>
                  {currentCase.priority}
                </BrutalBadge>
              </div>
              <div>
                <div className="text-xs font-black uppercase text-black/70 mb-1">Type</div>
                <span
                  className="inline-block border-2 border-black px-3 py-1 text-xs font-black uppercase"
                  style={{
                    backgroundColor: currentCase.case_type_color || '#e5e7eb',
                    color: '#000000',
                  }}
                >
                  {currentCase.case_type_name}
                </span>
              </div>
            </div>
            <BrutalButton onClick={() => setIsChangingStatus(true)} variant="primary" size="sm">
              Change Status
            </BrutalButton>
          </div>
        </BrutalCard>

        {/* Status Change Modal */}
        {isChangingStatus && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="status-modal-title"
          >
            <BrutalCard color="white" className="p-6 max-w-md w-full mx-4">
              <h3 id="status-modal-title" className="text-lg font-black uppercase mb-4 text-black">
                Change Case Status
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-black uppercase text-black/70 mb-2">
                    New Status
                  </label>
                  <select
                    value={newStatusId}
                    onChange={(e) => setNewStatusId(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-black bg-app-surface text-black focus:outline-none focus:ring-2 focus:ring-black"
                    aria-label="Select new status"
                  >
                    <option value="">Select new status...</option>
                    {caseStatuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black uppercase text-black/70 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={statusChangeNotes}
                    onChange={(e) => setStatusChangeNotes(e.target.value)}
                    rows={3}
                    placeholder="Reason for status change..."
                    className="w-full px-3 py-2 border-2 border-black bg-app-surface text-black focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <BrutalButton
                    onClick={() => {
                      setIsChangingStatus(false);
                      setNewStatusId('');
                      setStatusChangeNotes('');
                    }}
                    variant="secondary"
                  >
                    Cancel
                  </BrutalButton>
                  <BrutalButton
                    onClick={handleStatusChange}
                    disabled={!newStatusId || loading}
                    variant="primary"
                  >
                    {loading ? 'Updating...' : 'Update Status'}
                  </BrutalButton>
                </div>
              </div>
            </BrutalCard>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b-2 border-black dark:border-white">
          <nav className="flex gap-0" role="tablist" aria-label="Case details tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls={`panel-${tab.key}`}
                className={`px-4 py-3 font-black uppercase text-sm border-b-4 transition-colors ${activeTab === tab.key
                  ? 'border-black dark:border-white text-black dark:text-white bg-[var(--loop-yellow)]'
                  : 'border-transparent text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-app-surface-muted dark:hover:bg-app-text'
                  }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-black text-white dark:bg-app-surface dark:text-black rounded-none">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div
              id="panel-overview"
              role="tabpanel"
              aria-labelledby="tab-overview"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Case Information */}
              <BrutalCard color="white" className="p-6">
                <h3 className="text-lg font-black uppercase mb-4 text-black dark:text-white">
                  Case Information
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                      Client
                    </dt>
                    <dd className="text-sm font-bold text-black dark:text-white">
                      {currentCase.contact_first_name} {currentCase.contact_last_name}
                    </dd>
                  </div>
                  {currentCase.contact_email && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                        Email
                      </dt>
                      <dd className="text-sm font-bold text-black dark:text-white">
                        {currentCase.contact_email}
                      </dd>
                    </div>
                  )}
                  {currentCase.contact_phone && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                        Phone
                      </dt>
                      <dd className="text-sm font-bold text-black dark:text-white">
                        {currentCase.contact_phone}
                      </dd>
                    </div>
                  )}
                  {currentCase.description && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                        Description
                      </dt>
                      <dd className="text-sm font-bold text-black dark:text-white whitespace-pre-wrap">
                        {currentCase.description}
                      </dd>
                    </div>
                  )}
                  {currentCase.source && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                        Source
                      </dt>
                      <dd className="text-sm font-bold text-black dark:text-white capitalize">
                        {currentCase.source}
                      </dd>
                    </div>
                  )}
                  {currentCase.referral_source && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                        Referral Source
                      </dt>
                      <dd className="text-sm font-bold text-black dark:text-white">
                        {currentCase.referral_source}
                      </dd>
                    </div>
                  )}
                </dl>
              </BrutalCard>

              {/* Dates and Assignment */}
              <BrutalCard color="white" className="p-6">
                <h3 className="text-lg font-black uppercase mb-4 text-black dark:text-white">
                  Dates & Assignment
                </h3>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                      Intake Date
                    </dt>
                    <dd className="text-sm font-bold text-black dark:text-white">
                      {new Date(currentCase.intake_date).toLocaleDateString()}
                    </dd>
                  </div>
                  {currentCase.opened_date && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                        Opened Date
                      </dt>
                      <dd className="text-sm font-bold text-black dark:text-white">
                        {new Date(currentCase.opened_date).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  {currentCase.due_date && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                        Due Date
                      </dt>
                      <dd className="text-sm font-bold text-black dark:text-white">
                        {new Date(currentCase.due_date).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  {currentCase.closed_date && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                        Closed Date
                      </dt>
                      <dd className="text-sm font-bold text-black dark:text-white">
                        {new Date(currentCase.closed_date).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                  {currentCase.assigned_first_name && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60">
                        Assigned To
                      </dt>
                      <dd className="text-sm font-bold text-black dark:text-white">
                        {currentCase.assigned_first_name} {currentCase.assigned_last_name}
                      </dd>
                    </div>
                  )}
                  {currentCase.tags && currentCase.tags.length > 0 && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60 mb-2">
                        Tags
                      </dt>
                      <dd className="flex flex-wrap gap-2">
                        {currentCase.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-1 bg-[var(--loop-cyan)] text-black text-xs font-black border-2 border-black"
                          >
                            {tag}
                          </span>
                        ))}
                      </dd>
                    </div>
                  )}
                </dl>
              </BrutalCard>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && id && (
            <div id="panel-notes" role="tabpanel" aria-labelledby="tab-notes">
              <BrutalCard color="white" className="p-6">
                <CaseNotes caseId={id} />
              </BrutalCard>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && id && (
            <div id="panel-documents" role="tabpanel" aria-labelledby="tab-documents">
              <CaseDocuments caseId={id} contactId={currentCase.contact_id} />
            </div>
          )}

          {/* Milestones Tab */}
          {activeTab === 'milestones' && id && (
            <div id="panel-milestones" role="tabpanel" aria-labelledby="tab-milestones" className="space-y-4">
              {/* Progress Bar */}
              <BrutalCard color="white" className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black uppercase text-black dark:text-white">
                    Progress: {completedMilestones} / {caseMilestones.length} completed
                  </h3>
                  <BrutalButton onClick={() => { resetMilestoneForm(); setShowMilestoneForm(true); }} variant="primary" size="sm">
                    + Add Milestone
                  </BrutalButton>
                </div>
                <div className="w-full h-4 border-2 border-black bg-app-surface">
                  <div
                    className="h-full bg-[var(--loop-green)] transition-all duration-300"
                    style={{ width: caseMilestones.length > 0 ? `${(completedMilestones / caseMilestones.length) * 100}%` : '0%' }}
                  />
                </div>
              </BrutalCard>

              {/* Milestone Form */}
              {showMilestoneForm && (
                <BrutalCard color="white" className="p-6 border-2 border-black bg-[var(--loop-cyan)]">
                  <h3 className="text-lg font-black uppercase mb-4 text-black">
                    {editingMilestone ? 'Edit Milestone' : 'New Milestone'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black uppercase text-black/70 mb-1">Name *</label>
                      <input
                        type="text"
                        value={milestoneName}
                        onChange={(e) => setMilestoneName(e.target.value)}
                        placeholder="Milestone name..."
                        className="w-full px-3 py-2 border-2 border-black bg-app-surface text-black focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black uppercase text-black/70 mb-1">Description</label>
                      <textarea
                        value={milestoneDescription}
                        onChange={(e) => setMilestoneDescription(e.target.value)}
                        rows={2}
                        placeholder="Optional description..."
                        className="w-full px-3 py-2 border-2 border-black bg-app-surface text-black focus:outline-none focus:ring-2 focus:ring-black"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-black uppercase text-black/70 mb-1">Due Date</label>
                        <input
                          type="date"
                          value={milestoneDueDate}
                          onChange={(e) => setMilestoneDueDate(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-black bg-app-surface text-black focus:outline-none focus:ring-2 focus:ring-black"
                        />
                      </div>
                      {editingMilestone && (
                        <div className="flex items-end">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={milestoneCompleted}
                              onChange={(e) => setMilestoneCompleted(e.target.checked)}
                              className="w-4 h-4 border-2 border-black accent-black"
                            />
                            <span className="text-xs font-black uppercase text-black/70">Mark Complete</span>
                          </label>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end gap-3">
                      <BrutalButton onClick={resetMilestoneForm} variant="secondary">Cancel</BrutalButton>
                      <BrutalButton onClick={handleSaveMilestone} disabled={!milestoneName.trim() || loading} variant="primary">
                        {editingMilestone ? 'Update' : 'Create'}
                      </BrutalButton>
                    </div>
                  </div>
                </BrutalCard>
              )}

              {/* Milestone List */}
              {caseMilestones.length === 0 ? (
                <BrutalCard color="white" className="p-8">
                  <div className="text-center">
                    <div className="text-4xl mb-3">🎯</div>
                    <h3 className="text-lg font-black uppercase text-black dark:text-white mb-1">No Milestones Yet</h3>
                    <p className="text-sm text-black/60 dark:text-white/60">Add milestones to track progress on this case.</p>
                  </div>
                </BrutalCard>
              ) : (
                <div className="space-y-3">
                  {caseMilestones.map((milestone, index) => {
                    const isOverdueMilestone = milestone.due_date && new Date(milestone.due_date) < new Date() && !milestone.is_completed;
                    return (
                      <BrutalCard
                        key={milestone.id}
                        color={milestone.is_completed ? 'green' : isOverdueMilestone ? 'pink' : 'white'}
                        className={`p-4 ${milestone.is_completed ? 'opacity-80' : ''}`}
                      >
                        <div className="flex items-start gap-4">
                          {/* Completion checkbox */}
                          <button
                            onClick={() => handleToggleMilestoneComplete(milestone)}
                            className={`mt-1 w-6 h-6 border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors ${milestone.is_completed ? 'bg-[var(--loop-green)]' : 'bg-app-surface hover:bg-app-surface-muted'
                              }`}
                            title={milestone.is_completed ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {milestone.is_completed && <span className="text-black font-black">✓</span>}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-xs font-black text-black/50 dark:text-white/50">#{index + 1}</span>
                              <h4 className={`font-black text-black dark:text-white ${milestone.is_completed ? 'line-through' : ''
                                }`}>
                                {milestone.milestone_name}
                              </h4>
                              <BrutalBadge color={getMilestoneStatusColor(milestone.is_completed)} size="sm">
                                {milestone.is_completed ? 'Complete' : 'Pending'}
                              </BrutalBadge>
                            </div>
                            {milestone.description && (
                              <p className="text-sm text-black/70 dark:text-white/70 mb-1">{milestone.description}</p>
                            )}
                            <div className="flex gap-4 text-xs font-bold text-black/50 dark:text-white/50">
                              {milestone.due_date && (
                                <span className={isOverdueMilestone ? 'text-red-600 font-black' : ''}>
                                  Due: {new Date(milestone.due_date).toLocaleDateString()}
                                  {isOverdueMilestone && ' (OVERDUE)'}
                                </span>
                              )}
                              {milestone.completed_date && (
                                <span className="text-green-700">Completed: {new Date(milestone.completed_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleEditMilestone(milestone)}
                              className="border-2 border-black bg-app-surface text-black px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMilestone(milestone.id)}
                              className="border-2 border-black bg-red-100 text-black px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      </BrutalCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Follow-ups Tab */}
          {activeTab === 'portal' && id && (
            <div id="panel-portal" role="tabpanel" aria-labelledby="tab-portal">
              <BrutalCard color="white" className="p-6">
                <CasePortalConversations caseId={id} />
              </BrutalCard>
            </div>
          )}

          {/* Follow-ups Tab */}
          {activeTab === 'followups' && id && (
            <div id="panel-followups" role="tabpanel" aria-labelledby="tab-followups">
              <BrutalCard color="white" className="p-6">
                <FollowUpList entityType="case" entityId={id} />
              </BrutalCard>
            </div>
          )}

          {/* Relationships Tab */}
          {activeTab === 'relationships' && id && (
            <div id="panel-relationships" role="tabpanel" aria-labelledby="tab-relationships">
              <BrutalCard color="white" className="p-6">
                <CaseRelationships caseId={id} />
              </BrutalCard>
            </div>
          )}

          {/* Services Tab */}
          {activeTab === 'services' && id && (
            <div id="panel-services" role="tabpanel" aria-labelledby="tab-services">
              <BrutalCard color="white" className="p-6">
                <CaseServices caseId={id} />
              </BrutalCard>
            </div>
          )}
        </div>
        <ConfirmDialog {...dialogState} onConfirm={handleConfirm} onCancel={handleCancel} />
      </div>
    </NeoBrutalistLayout>
  );
};

export default CaseDetail;
