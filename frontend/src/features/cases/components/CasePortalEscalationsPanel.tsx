import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrutalBadge, BrutalButton } from '../../../components/neo-brutalist';
import { useToast } from '../../../contexts/useToast';
import type {
  CasePortalEscalation,
  CasePortalEscalationStatus,
} from '../../../types/case';
import { casesApiClient } from '../api/casesApiClient';

interface CasePortalEscalationsPanelProps {
  caseId: string;
  onChanged?: () => void;
}

const statusOptions: Array<{ value: CasePortalEscalationStatus; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_review', label: 'In review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'referred', label: 'Referred' },
];

const statusTone: Record<CasePortalEscalationStatus, 'green' | 'yellow' | 'red' | 'gray' | 'blue'> = {
  open: 'yellow',
  in_review: 'blue',
  resolved: 'green',
  referred: 'gray',
};

const formatDateTime = (value: string | null): string => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleString();
};

const getInitialResolution = (escalation: CasePortalEscalation): string =>
  escalation.resolutionSummary || '';

export default function CasePortalEscalationsPanel({
  caseId,
  onChanged,
}: CasePortalEscalationsPanelProps) {
  const { showError, showSuccess } = useToast();
  const [escalations, setEscalations] = useState<CasePortalEscalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<
    Record<string, { status: CasePortalEscalationStatus; resolutionSummary: string }>
  >({});

  const loadEscalations = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await casesApiClient.listCasePortalEscalations(caseId);
      setEscalations(rows);
      setDrafts(
        rows.reduce<Record<string, { status: CasePortalEscalationStatus; resolutionSummary: string }>>(
          (next, escalation) => {
            next[escalation.id] = {
              status: escalation.status,
              resolutionSummary: getInitialResolution(escalation),
            };
            return next;
          },
          {}
        )
      );
    } catch (error) {
      console.error('Failed to load portal review requests', error);
      showError('Unable to load portal review requests.');
    } finally {
      setLoading(false);
    }
  }, [caseId, showError]);

  useEffect(() => {
    void loadEscalations();
  }, [loadEscalations]);

  const openCount = useMemo(
    () => escalations.filter((item) => item.status === 'open' || item.status === 'in_review').length,
    [escalations]
  );

  const updateDraft = (
    escalationId: string,
    update: Partial<{ status: CasePortalEscalationStatus; resolutionSummary: string }>
  ) => {
    setDrafts((current) => ({
      ...current,
      [escalationId]: {
        status: update.status ?? current[escalationId]?.status ?? 'open',
        resolutionSummary:
          update.resolutionSummary ?? current[escalationId]?.resolutionSummary ?? '',
      },
    }));
  };

  const saveEscalation = async (escalation: CasePortalEscalation) => {
    const draft = drafts[escalation.id];
    if (!draft) return;

    try {
      setSavingId(escalation.id);
      await casesApiClient.updateCasePortalEscalation(caseId, escalation.id, {
        status: draft.status,
        resolution_summary: draft.resolutionSummary.trim() || null,
      });
      showSuccess('Portal review request updated.');
      await loadEscalations();
      onChanged?.();
    } catch (error) {
      console.error('Failed to update portal review request', error);
      showError('Unable to update portal review request.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-4" aria-label="Portal review requests">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black uppercase text-black dark:text-white">
            Portal Review Requests
          </h3>
          <p className="text-xs font-bold uppercase text-black/60 dark:text-white/60">
            {openCount} active
          </p>
        </div>
      </div>

      {loading ? (
        <div className="border-2 border-black bg-app-surface-muted p-4 text-sm font-bold text-black/70 dark:text-white/70">
          Loading portal review requests...
        </div>
      ) : escalations.length === 0 ? (
        <div className="border-2 border-dashed border-black/30 bg-app-surface-muted p-4 text-sm font-bold text-black/60 dark:text-white/60">
          No portal review requests for this case.
        </div>
      ) : (
        <div className="space-y-3">
          {escalations.map((escalation) => {
            const draft = drafts[escalation.id] || {
              status: escalation.status,
              resolutionSummary: getInitialResolution(escalation),
            };

            return (
              <article key={escalation.id} className="border-2 border-black bg-app-surface p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <BrutalBadge color={statusTone[escalation.status]} size="sm">
                        {escalation.status.replace('_', ' ')}
                      </BrutalBadge>
                      <BrutalBadge color={escalation.severity === 'urgent' ? 'red' : 'gray'} size="sm">
                        {escalation.severity}
                      </BrutalBadge>
                      {escalation.sensitivity === 'sensitive' && (
                        <BrutalBadge color="yellow" size="sm">
                          Sensitive
                        </BrutalBadge>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm font-bold text-black dark:text-white">
                      {escalation.reason}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-bold uppercase text-black/60 dark:text-white/60">
                      <span>Category: {escalation.category.replace('_', ' ')}</span>
                      <span>Submitted: {formatDateTime(escalation.createdAt)}</span>
                      <span>SLA: {formatDateTime(escalation.slaDueAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto] md:items-end">
                  <label className="block text-xs font-black uppercase text-black/70 dark:text-white/70">
                    Status
                    <select
                      value={draft.status}
                      onChange={(event) =>
                        updateDraft(escalation.id, {
                          status: event.target.value as CasePortalEscalationStatus,
                        })
                      }
                      className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-black uppercase text-black/70 dark:text-white/70">
                    Resolution Summary
                    <textarea
                      value={draft.resolutionSummary}
                      onChange={(event) =>
                        updateDraft(escalation.id, { resolutionSummary: event.target.value })
                      }
                      rows={2}
                      className="mt-1 w-full border-2 border-black bg-app-surface px-3 py-2 text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-black"
                    />
                  </label>
                  <BrutalButton
                    onClick={() => void saveEscalation(escalation)}
                    disabled={savingId === escalation.id}
                    variant="primary"
                    size="sm"
                  >
                    Save
                  </BrutalButton>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
