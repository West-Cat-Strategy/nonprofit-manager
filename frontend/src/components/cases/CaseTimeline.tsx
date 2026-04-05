import { useCallback, useEffect, useState } from 'react';
import { casesApiClient } from '../../features/cases/api/casesApiClient';
import { useToast } from '../../contexts/useToast';
import CaseProvenanceSummary from './CaseProvenanceSummary';
import type { CaseProvenance, CaseTimelineEvent } from '../../types/case';

interface CaseTimelineProps {
  caseId: string;
  refreshKey?: number;
  provenance?: CaseProvenance | null;
}

const TIMELINE_PAGE_LIMIT = 50;

const eventTypeLabel: Record<CaseTimelineEvent['type'], string> = {
  appointment: 'Appointment',
  attendance: 'Attendance',
  conversation: 'Conversation',
  document: 'Document',
  follow_up: 'Follow-up',
  note: 'Note',
  outcome: 'Outcome',
  topic: 'Topic',
};

const eventTypeBadgeClass: Record<CaseTimelineEvent['type'], string> = {
  appointment: 'bg-app-accent-soft text-app-accent-text',
  attendance: 'bg-app-accent-soft text-app-accent-text',
  conversation: 'bg-app-accent-soft text-app-accent-text',
  document: 'bg-app-accent-soft text-app-accent-text',
  follow_up: 'bg-app-accent-soft text-app-accent-text',
  note: 'bg-app-accent-soft text-app-accent-text',
  outcome: 'bg-app-accent-soft text-app-accent-text',
  topic: 'bg-app-accent-soft text-app-accent-text',
};

const formatMetadataDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const getTimelineMeta = (event: CaseTimelineEvent): string[] => {
  const metadata = event.metadata || {};

  switch (event.type) {
    case 'appointment':
      return [
        typeof metadata.status === 'string' ? `Status: ${metadata.status}` : '',
        typeof metadata.attendance_state === 'string'
          ? `Attendance: ${metadata.attendance_state}`
          : '',
        formatMetadataDate(metadata.start_time)
          ? `Starts: ${formatMetadataDate(metadata.start_time)}`
          : '',
        metadata.missing_note ? 'Missing note' : '',
        metadata.missing_outcome ? 'Missing outcome' : '',
        metadata.last_reminder_sent_at
          ? `Reminder sent: ${formatMetadataDate(metadata.last_reminder_sent_at)}`
          : '',
      ].filter(Boolean);
    case 'conversation':
      return [
        typeof metadata.status === 'string' ? `Status: ${metadata.status}` : '',
        metadata.portal_email ? `Portal: ${String(metadata.portal_email)}` : '',
        metadata.resolution_complete ? 'Resolution complete' : 'Resolution missing',
      ].filter(Boolean);
    case 'follow_up':
      return [
        typeof metadata.status === 'string' ? `Status: ${metadata.status}` : '',
        metadata.scheduled_date ? `Scheduled: ${String(metadata.scheduled_date)}` : '',
        typeof metadata.method === 'string' ? `Method: ${metadata.method}` : '',
      ].filter(Boolean);
    case 'attendance':
      return [
        typeof metadata.registration_status === 'string'
          ? `Registration: ${metadata.registration_status}`
          : '',
        typeof metadata.checked_in === 'boolean'
          ? metadata.checked_in
            ? 'Checked in'
            : 'Not checked in'
          : '',
        typeof metadata.check_in_method === 'string'
          ? `Method: ${metadata.check_in_method}`
          : '',
      ].filter(Boolean);
    case 'outcome':
      return [
        typeof metadata.workflow_stage === 'string'
          ? `Stage: ${metadata.workflow_stage}`
          : '',
      ].filter(Boolean);
    default:
      return [];
  }
};

const CaseTimeline = ({ caseId, refreshKey, provenance }: CaseTimelineProps) => {
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [events, setEvents] = useState<CaseTimelineEvent[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadTimeline = useCallback(async (options?: { append?: boolean; cursor?: string | null }) => {
    const append = Boolean(options?.append);
    try {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }

      const timelinePage = await casesApiClient.getCaseTimeline(caseId, {
        limit: TIMELINE_PAGE_LIMIT,
        cursor: options?.cursor || undefined,
      });
      const rows = timelinePage.items || [];

      setEvents((previous) => {
        if (!append) {
          return rows;
        }

        const seen = new Set(previous.map((entry) => `${entry.type}-${entry.id}`));
        const merged = [...previous];
        for (const row of rows) {
          const key = `${row.type}-${row.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(row);
          }
        }
        return merged;
      });
      setHasMore(Boolean(timelinePage.page?.has_more));
      setNextCursor(timelinePage.page?.next_cursor || null);
    } catch {
      showError('Failed to load case timeline');
    } finally {
      if (append) {
        setLoadingMore(false);
      } else {
        setLoading(false);
      }
    }
  }, [caseId, showError]);

  useEffect(() => {
    setHasMore(false);
    setNextCursor(null);
    void loadTimeline();
  }, [loadTimeline, refreshKey]);

  const renderTimelineEvent = (event: CaseTimelineEvent) => {
    const metadataDetails = getTimelineMeta(event);

    return (
      <div key={`${event.type}-${event.id}`} className="rounded-lg border border-app-border bg-app-surface p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`rounded px-2 py-0.5 text-xs ${eventTypeBadgeClass[event.type]}`}>
            {eventTypeLabel[event.type]}
          </span>
          {event.visible_to_client ? (
            <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text">Client visible</span>
          ) : (
            <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
              Internal
            </span>
          )}
          <span className="text-xs text-app-text-muted">
            {new Date(event.created_at).toLocaleString()}
          </span>
        </div>
        <p className="text-sm font-semibold text-app-text">{event.title}</p>
        {event.content && <p className="mt-1 whitespace-pre-wrap text-sm text-app-text">{event.content}</p>}
        {metadataDetails.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {metadataDetails.map((detail) => (
              <span
                key={detail}
                className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted"
              >
                {detail}
              </span>
            ))}
          </div>
        )}
        {(event.first_name || event.last_name) && (
          <p className="mt-2 text-xs text-app-text-muted">
            {event.first_name || 'Staff'} {event.last_name || ''}
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {provenance && (
        <CaseProvenanceSummary provenance={provenance} variant="staff" density="inline" />
      )}

      {loading && <p className="text-sm text-app-text-muted">Loading timeline...</p>}

      {!loading && events.length === 0 && (
        <div className="rounded-lg border border-app-border bg-app-surface-muted p-8 text-center">
          <p className="text-sm text-app-text-muted">No timeline activity yet.</p>
        </div>
      )}

      {!loading && events.map((event) => renderTimelineEvent(event))}

      {!loading && hasMore && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => void loadTimeline({ append: true, cursor: nextCursor })}
            disabled={loadingMore}
            className="rounded border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text disabled:opacity-60"
          >
            {loadingMore ? 'Loading more...' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
};

export default CaseTimeline;
