import { BrutalBadge, BrutalButton, BrutalCard, NeoBrutalistLayout } from '../../../components/neo-brutalist';
import { Link } from 'react-router-dom';
import CaseNotes from '../components/CaseNotesPanel';
import CaseDocuments from '../../../components/CaseDocuments';
import FollowUpList from '../../../components/FollowUpList';
import CaseRelationships from '../../../components/cases/CaseRelationships';
import CaseProvenanceSummary from '../../../components/cases/CaseProvenanceSummary';
import CaseServices from '../../../components/cases/CaseServices';
import CasePortalConversations from '../../../components/cases/CasePortalConversations';
import CaseTimeline from '../../../components/cases/CaseTimeline';
import CaseOutcomesTopics from '../../../components/cases/CaseOutcomesTopics';
import CaseAppointments from '../../../components/cases/CaseAppointments';
import type { CaseMilestone } from '../../../types/case';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { getCasePriorityBadgeColor } from '../utils/casePriority';
import CaseTeamChatPanel from '../../teamChat/components/CaseTeamChatPanel';
import CaseDetailTabs from '../components/CaseDetailTabs';
import CaseStatusChangeModal from '../components/CaseStatusChangeModal';
import CaseFormsPanel from '../components/CaseFormsPanel';
import CaseReassessmentPanel from '../components/CaseReassessmentPanel';
import CasePortalEscalationsPanel from '../components/CasePortalEscalationsPanel';
import { useCaseDetailPage } from '../hooks/useCaseDetailPage';

const CaseDetail = () => {
  const {
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
  } = useCaseDetailPage();

  if (id && !hasValidId) {
    return (
      <div className="p-6">
        <BrutalCard color="yellow" className="p-6">
          <div className="text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h2 className="text-xl font-black uppercase text-black mb-2">Invalid Case Link</h2>
            <p className="font-bold text-black/70 mb-4">
              This case link is invalid. Please return to the Cases list and try again.
            </p>
            <BrutalButton onClick={handleNavigateBack} variant="primary">
              Back to Cases
            </BrutalButton>
          </div>
        </BrutalCard>
      </div>
    );
  }

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
              <BrutalButton onClick={handleNavigateBack} variant="secondary">
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
              <BrutalButton onClick={handleNavigateBack} variant="primary">
                Back to Cases
              </BrutalButton>
            </div>
          </BrutalCard>
        </div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="Case Details">
      <div className="p-6 space-y-6">
        <BrutalCard color="yellow" className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <button
                onClick={handleNavigateBack}
                className="mb-2 flex items-center gap-1 border-2 border-black bg-black px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white shadow-[2px_2px_0px_#facc15] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-zinc-900 hover:shadow-[1px_1px_0px_#facc15] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label="Back to cases"
              >
                ← Back to Cases
              </button>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                  {currentCase.case_number}
                </h1>
                {currentCase.is_urgent && (
                  <span className="px-3 py-1 bg-app-accent text-[var(--app-accent-foreground)] text-sm font-black rounded-none border-2 border-black">
                    ⚠️ URGENT
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-black">{currentCase.title}</h2>
              {caseProvenance && (
                <CaseProvenanceSummary
                  provenance={caseProvenance}
                  variant="staff"
                  density="inline"
                  className="mt-3"
                />
              )}
            </div>
            <div className="flex flex-col gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-black uppercase text-black/80">
                <input
                  type="checkbox"
                  checked={Boolean(currentCase.client_viewable)}
                  onChange={() => void handleToggleClientViewable()}
                  className="h-4 w-4 border-2 border-black accent-black"
                />
                Client Viewable
              </label>
              <div className="flex gap-2">
                <BrutalButton onClick={handleOpenNotes} variant="primary" size="sm">
                  Add Note
                </BrutalButton>
                <BrutalButton onClick={handleOpenDocuments} variant="secondary" size="sm">
                  Upload Document
                </BrutalButton>
              </div>
              <div className="flex gap-2">
                <BrutalButton onClick={handleNavigateEdit} variant="secondary">
                  Edit
                </BrutalButton>
                <BrutalButton onClick={handleDelete} variant="danger">
                  Delete
                </BrutalButton>
              </div>
            </div>
          </div>
        </BrutalCard>

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
                <BrutalBadge color={getCasePriorityBadgeColor(currentCase.priority)}>
                  {currentCase.priority}
                </BrutalBadge>
              </div>
              <div>
                <div className="text-xs font-black uppercase text-black/70 mb-1">Type</div>
                <div className="flex flex-wrap gap-2">
                  {caseTypeLabels.visible.map((label) => (
                    <span
                      key={label}
                      className="inline-block border-2 border-black bg-app-surface-muted px-3 py-1 text-xs font-black uppercase text-black"
                    >
                      {label}
                    </span>
                  ))}
                  {caseTypeLabels.hiddenCount > 0 && (
                    <span className="inline-block border-2 border-black bg-[var(--loop-green)] px-3 py-1 text-xs font-black uppercase text-black">
                      +{caseTypeLabels.hiddenCount}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs font-black uppercase text-black/70 mb-1">Outcome</div>
                <div className="flex flex-wrap gap-2">
                  {caseOutcomeLabels.visible.map((label) => (
                    <span
                      key={label}
                      className="inline-block border-2 border-black bg-app-surface-muted px-3 py-1 text-xs font-black uppercase text-black"
                    >
                      {label}
                    </span>
                  ))}
                  {caseOutcomeLabels.hiddenCount > 0 && (
                    <span className="inline-block border-2 border-black bg-[var(--loop-green)] px-3 py-1 text-xs font-black uppercase text-black">
                      +{caseOutcomeLabels.hiddenCount}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <BrutalButton onClick={() => setIsChangingStatus(true)} variant="primary" size="sm">
              Change Status
            </BrutalButton>
          </div>
        </BrutalCard>

        <CaseStatusChangeModal
          open={isChangingStatus}
          loading={loading}
          caseStatuses={caseStatuses}
          newStatusId={newStatusId}
          notes={statusChangeNotes}
          outcomeDefinitionIds={statusOutcomeDefinitionIds}
          outcomeVisibility={statusOutcomeVisibility}
          requiresOutcome={selectedStatusRequiresOutcome}
          outcomeDefinitions={activeOutcomeDefinitions}
          onNewStatusIdChange={setNewStatusId}
          onNotesChange={setStatusChangeNotes}
          onOutcomeDefinitionIdsChange={setStatusOutcomeDefinitionIds}
          onOutcomeVisibilityChange={setStatusOutcomeVisibility}
          onCancel={closeStatusChangeModal}
          onSubmit={handleStatusChange}
        />

        <CaseDetailTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTabWithUrl} />

        <div>
          {activeTab === 'overview' && (
            <div
              id="panel-overview"
              role="tabpanel"
              aria-labelledby="tab-overview"
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
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
                      <Link
                        to={`/contacts/${currentCase.contact_id}`}
                        className="underline decoration-2 underline-offset-2 hover:text-[var(--loop-green)]"
                      >
                        {currentCase.contact_first_name} {currentCase.contact_last_name}
                      </Link>
                    </dd>
                    <div className="mt-2">
                      <Link
                        to={`/contacts/${currentCase.contact_id}`}
                        className="inline-flex border-2 border-black bg-[var(--loop-yellow)] px-3 py-1 text-xs font-black uppercase text-black hover:bg-[var(--loop-green)]"
                      >
                        Open Contact Record
                      </Link>
                    </div>
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
                        {currentCase.tags.map((tag: string) => (
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
                  {caseTypeLabels.visible.length > 0 && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60 mb-2">
                        Types
                      </dt>
                      <dd className="flex flex-wrap gap-2">
                        {caseTypeLabels.visible.map((label) => (
                          <span
                            key={label}
                            className="px-2 py-1 bg-[var(--loop-green)] text-black text-xs font-black border-2 border-black"
                          >
                            {label}
                          </span>
                        ))}
                        {caseTypeLabels.hiddenCount > 0 && (
                          <span className="px-2 py-1 bg-app-surface-muted text-black text-xs font-black border-2 border-black">
                            +{caseTypeLabels.hiddenCount} more
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                  {caseOutcomeLabels.visible.length > 0 && (
                    <div>
                      <dt className="text-xs font-black uppercase text-black/60 dark:text-white/60 mb-2">
                        Outcomes
                      </dt>
                      <dd className="flex flex-wrap gap-2">
                        {caseOutcomeLabels.visible.map((label) => (
                          <span
                            key={label}
                            className="px-2 py-1 bg-app-accent-soft text-black text-xs font-black border-2 border-black"
                          >
                            {label}
                          </span>
                        ))}
                        {caseOutcomeLabels.hiddenCount > 0 && (
                          <span className="px-2 py-1 bg-app-surface-muted text-black text-xs font-black border-2 border-black">
                            +{caseOutcomeLabels.hiddenCount} more
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </BrutalCard>

              {caseProvenance && (
                <div className="lg:col-span-2">
                  <CaseProvenanceSummary provenance={caseProvenance} variant="staff" density="panel" />
                </div>
              )}
            </div>
          )}

          {activeTab === 'timeline' && id && (
            <div id="panel-timeline" role="tabpanel" aria-labelledby="tab-timeline">
              <BrutalCard color="white" className="p-6">
                <CaseTimeline caseId={id} refreshKey={timelineRefreshKey} provenance={caseProvenance} />
              </BrutalCard>
            </div>
          )}

          {activeTab === 'notes' && id && (
            <div id="panel-notes" role="tabpanel" aria-labelledby="tab-notes">
              <BrutalCard color="white" className="p-6">
                <CaseNotes caseId={id} onChanged={refreshCaseArtifacts} provenance={caseProvenance} />
              </BrutalCard>
            </div>
          )}

          {activeTab === 'forms' && id && (
            <div id="panel-forms" role="tabpanel" aria-labelledby="tab-forms">
              <CaseFormsPanel
                caseId={id}
                clientEmail={currentCase.contact_email || null}
                clientViewable={Boolean(currentCase.client_viewable)}
                onChanged={refreshCaseArtifacts}
              />
            </div>
          )}

          {activeTab === 'outcomes_topics' && id && (
            <div id="panel-outcomes-topics" role="tabpanel" aria-labelledby="tab-outcomes-topics">
              <BrutalCard color="white" className="p-6">
                <CaseOutcomesTopics caseId={id} onChanged={refreshCaseArtifacts} />
              </BrutalCard>
            </div>
          )}

          {activeTab === 'documents' && id && (
            <div id="panel-documents" role="tabpanel" aria-labelledby="tab-documents">
              <CaseDocuments caseId={id} contactId={currentCase.contact_id} onChanged={refreshCaseArtifacts} />
            </div>
          )}

          {activeTab === 'milestones' && id && (
            <div id="panel-milestones" role="tabpanel" aria-labelledby="tab-milestones" className="space-y-4">
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
                    className={`h-full bg-[var(--loop-green)] transition-all duration-300 ${getProgressWidthClass(
                      caseMilestones.length > 0
                        ? (completedMilestones / caseMilestones.length) * 100
                        : 0
                    )}`}
                  />
                </div>
              </BrutalCard>

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
                  {caseMilestones.map((milestone: CaseMilestone, index: number) => {
                    const isOverdueMilestone = milestone.due_date && new Date(milestone.due_date) < new Date() && !milestone.is_completed;
                    return (
                      <BrutalCard
                        key={milestone.id}
                        color={milestone.is_completed ? 'green' : isOverdueMilestone ? 'pink' : 'white'}
                        className={`p-4 ${milestone.is_completed ? 'opacity-80' : ''}`}
                      >
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => handleToggleMilestoneComplete(milestone)}
                            className={`mt-1 w-6 h-6 border-2 border-black flex items-center justify-center flex-shrink-0 transition-colors ${milestone.is_completed ? 'bg-[var(--loop-green)]' : 'bg-app-surface hover:bg-app-surface-muted'
                              }`}
                            title={milestone.is_completed ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {milestone.is_completed && <span className="text-black font-black">✓</span>}
                          </button>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-xs font-black text-black/50 dark:text-white/50">#{index + 1}</span>
                              <h4 className={`font-black text-black dark:text-white ${milestone.is_completed ? 'line-through' : ''
                                }`}>
                                {milestone.milestone_name}
                              </h4>
                              <BrutalBadge color={milestone.is_completed ? 'green' : 'gray'} size="sm">
                                {milestone.is_completed ? 'Complete' : 'Pending'}
                              </BrutalBadge>
                            </div>
                            {milestone.description && (
                              <p className="text-sm text-black/70 dark:text-white/70 mb-1">{milestone.description}</p>
                            )}
                            <div className="flex gap-4 text-xs font-bold text-black/50 dark:text-white/50">
                              {milestone.due_date && (
                                <span className={isOverdueMilestone ? 'text-app-accent font-black' : ''}>
                                  Due: {new Date(milestone.due_date).toLocaleDateString()}
                                  {isOverdueMilestone && ' (OVERDUE)'}
                                </span>
                              )}
                              {milestone.completed_date && (
                                <span className="text-app-accent-text">Completed: {new Date(milestone.completed_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => handleEditMilestone(milestone)}
                              className="border-2 border-black bg-app-surface text-black px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteMilestone(milestone.id)}
                              className="border-2 border-black bg-app-accent-soft text-black px-2 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_var(--shadow-color)] hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0px_var(--shadow-color)] transition-all"
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

          {activeTab === 'team_chat' && id && (
            <div id="panel-team-chat" role="tabpanel" aria-labelledby="tab-team-chat">
              <CaseTeamChatPanel caseId={id} />
            </div>
          )}

          {activeTab === 'portal' && id && (
            <div id="panel-portal" role="tabpanel" aria-labelledby="tab-portal">
              <BrutalCard color="white" className="space-y-6 p-6">
                <CasePortalEscalationsPanel caseId={id} onChanged={refreshCaseArtifacts} />
                <CasePortalConversations
                  caseId={id}
                  outcomeDefinitions={activeOutcomeDefinitions}
                  onChanged={refreshCaseArtifacts}
                />
              </BrutalCard>
            </div>
          )}

          {activeTab === 'appointments' && id && (
            <div id="panel-appointments" role="tabpanel" aria-labelledby="tab-appointments">
              <BrutalCard color="white" className="p-6">
                <CaseAppointments
                  caseId={id}
                  outcomeDefinitions={activeOutcomeDefinitions}
                  onChanged={refreshCaseArtifacts}
                />
              </BrutalCard>
            </div>
          )}

          {activeTab === 'followups' && id && (
            <div id="panel-followups" role="tabpanel" aria-labelledby="tab-followups">
              <BrutalCard color="white" className="p-6 space-y-6">
                <CaseReassessmentPanel
                  caseId={id}
                  defaultOwnerUserId={currentCase.assigned_to || null}
                  defaultOwnerName={
                    [currentCase.assigned_first_name, currentCase.assigned_last_name]
                      .filter(Boolean)
                      .join(' ')
                      .trim() || currentCase.assigned_email || null
                  }
                  outcomeDefinitions={activeOutcomeDefinitions}
                  onChanged={refreshCaseArtifacts}
                />
                <FollowUpList entityType="case" entityId={id} />
              </BrutalCard>
            </div>
          )}

          {activeTab === 'relationships' && id && (
            <div id="panel-relationships" role="tabpanel" aria-labelledby="tab-relationships">
              <BrutalCard color="white" className="p-6">
                <CaseRelationships caseId={id} />
              </BrutalCard>
            </div>
          )}

          {activeTab === 'services' && id && (
            <div id="panel-services" role="tabpanel" aria-labelledby="tab-services">
              <BrutalCard color="white" className="p-6">
                <CaseServices caseId={id} provenance={caseProvenance} />
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
