import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import {
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  PageHeader,
  SectionCard,
  SelectField,
} from '../../../components/ui';
import { reportsApiClient } from '../api/reportsApiClient';
import type {
  WorkflowCoverageFilters,
  WorkflowCoverageMissingFilter,
  WorkflowCoverageReportResult,
} from '../types/contracts';

const summaryCardClass =
  'rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface p-4';

export default function WorkflowCoverageReportPage() {
  const [filters, setFilters] = useState<WorkflowCoverageFilters>({});
  const [report, setReport] = useState<WorkflowCoverageReportResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadReport = async () => {
      try {
        setLoading(true);
        setError(null);
        const nextReport = await reportsApiClient.fetchWorkflowCoverageReport(filters);
        if (active) {
          setReport(nextReport);
        }
      } catch (loadError) {
        console.error('Failed to load workflow coverage report', loadError);
        if (active) {
          setError('Failed to load workflow coverage report');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadReport();
    return () => {
      active = false;
    };
  }, [filters]);

  const handleFilterChange = <K extends keyof WorkflowCoverageFilters>(
    key: K,
    value: WorkflowCoverageFilters[K]
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  return (
    <NeoBrutalistLayout pageTitle="WORKFLOW COVERAGE REPORT">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <PageHeader
          title="Workflow Coverage Report"
          description="Find unresolved conversations, missing appointment/follow-up notes or outcomes, reminder gaps, and unlinked attendance."
        />

        <SectionCard title="Filters" subtitle="Narrow the gap list by owner, case status, or missing coverage type.">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <FormField
              type="text"
              label="Owner ID"
              value={filters.ownerId || ''}
              onChange={(event) => handleFilterChange('ownerId', event.target.value || undefined)}
              placeholder="Optional"
            />
            <SelectField
              label="Case Status"
              value={filters.statusType || ''}
              onChange={(event) =>
                handleFilterChange(
                  'statusType',
                  (event.target.value || undefined) as WorkflowCoverageFilters['statusType']
                )
              }
            >
              <option value="">All statuses</option>
              <option value="intake">Intake</option>
              <option value="active">Active</option>
              <option value="review">Review</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </SelectField>
            <SelectField
              label="Missing"
              value={filters.missing || ''}
              onChange={(event) =>
                handleFilterChange(
                  'missing',
                  (event.target.value || undefined) as WorkflowCoverageMissingFilter | undefined
                )
              }
            >
              <option value="">All gaps</option>
              <option value="note">Notes</option>
              <option value="outcome">Outcomes</option>
              <option value="reminder">Reminders</option>
              <option value="attendance">Attendance</option>
            </SelectField>
          </div>
        </SectionCard>

        {loading && <LoadingState label="Loading workflow coverage..." />}

        {!loading && error && (
          <ErrorState
            message={error}
            onRetry={() => setFilters((current) => ({ ...current }))}
            retryLabel="Retry"
          />
        )}

        {!loading && !error && report && (
          <>
            <SectionCard title="Summary">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                <div className={summaryCardClass}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                    Cases with gaps
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-app-text">
                    {report.summary.casesWithGaps}
                  </div>
                </div>
                <div className={summaryCardClass}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                    Conversation gaps
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-app-text">
                    {report.summary.missingConversationResolutionCount}
                  </div>
                </div>
                <div className={summaryCardClass}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                    Note gaps
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-app-text">
                    {report.summary.missingAppointmentNoteCount +
                      report.summary.missingFollowUpNoteCount}
                  </div>
                </div>
                <div className={summaryCardClass}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                    Outcome gaps
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-app-text">
                    {report.summary.missingAppointmentOutcomeCount +
                      report.summary.missingFollowUpOutcomeCount +
                      report.summary.missingCaseStatusOutcomeCount}
                  </div>
                </div>
                <div className={summaryCardClass}>
                  <div className="text-xs font-semibold uppercase tracking-wide text-app-text-muted">
                    Total gaps
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-app-text">
                    {report.summary.totalGaps}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Cases with Workflow Gaps">
              {report.items.length === 0 ? (
                <EmptyState
                  title="No workflow gaps found"
                  description="The selected cases have complete conversation, appointment, follow-up, reminder, and attendance coverage."
                />
              ) : (
                <div className="space-y-3">
                  {report.items.map((item) => (
                    <div
                      key={item.caseId}
                      className="rounded-[var(--ui-radius-sm)] border border-app-border-muted bg-app-surface p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              to={`/cases/${item.caseId}`}
                              className="text-base font-semibold text-app-accent hover:underline"
                            >
                              {item.caseNumber}
                            </Link>
                            <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                              {item.statusName || item.statusType || 'Unknown status'}
                            </span>
                            <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                              {item.totalGaps} gaps
                            </span>
                          </div>
                          <div className="text-sm text-app-text">{item.caseTitle}</div>
                          <div className="text-xs text-app-text-muted">
                            {item.contactName || 'No contact linked'}
                            {item.assignedToName ? ` • Owner: ${item.assignedToName}` : ''}
                          </div>
                        </div>
                        <Link
                          to={`/cases/${item.caseId}?tab=appointments`}
                          className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text"
                        >
                          Open workflow
                        </Link>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <div className={summaryCardClass}>
                          <div className="text-xs uppercase text-app-text-muted">Conversation resolution</div>
                          <div className="mt-1 text-xl font-semibold text-app-text">
                            {item.missingConversationResolutionCount}
                          </div>
                        </div>
                        <div className={summaryCardClass}>
                          <div className="text-xs uppercase text-app-text-muted">Appointment note/outcome</div>
                          <div className="mt-1 text-xl font-semibold text-app-text">
                            {item.missingAppointmentNoteCount} / {item.missingAppointmentOutcomeCount}
                          </div>
                        </div>
                        <div className={summaryCardClass}>
                          <div className="text-xs uppercase text-app-text-muted">Follow-up note/outcome</div>
                          <div className="mt-1 text-xl font-semibold text-app-text">
                            {item.missingFollowUpNoteCount} / {item.missingFollowUpOutcomeCount}
                          </div>
                        </div>
                        <div className={summaryCardClass}>
                          <div className="text-xs uppercase text-app-text-muted">Reminder / attendance / status</div>
                          <div className="mt-1 text-xl font-semibold text-app-text">
                            {item.missingReminderOfferCount} / {item.missingAttendanceLinkageCount} /{' '}
                            {item.missingCaseStatusOutcomeCount}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          </>
        )}
      </div>
    </NeoBrutalistLayout>
  );
}
