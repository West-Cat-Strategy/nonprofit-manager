import { useCallback, useEffect, useState } from 'react';
import { casesApiClient } from '../../features/cases/api/casesApiClient';
import { useToast } from '../../contexts/useToast';
import type { CaseTimelineEvent } from '../../types/case';

interface CaseTimelineProps {
  caseId: string;
  refreshKey?: number;
}

const eventTypeLabel: Record<CaseTimelineEvent['type'], string> = {
  note: 'Note',
  outcome: 'Outcome',
  topic: 'Topic',
  document: 'Document',
};

const eventTypeBadgeClass: Record<CaseTimelineEvent['type'], string> = {
  note: 'bg-blue-100 text-blue-800',
  outcome: 'bg-green-100 text-green-800',
  topic: 'bg-orange-100 text-orange-800',
  document: 'bg-purple-100 text-purple-800',
};

const CaseTimeline = ({ caseId, refreshKey }: CaseTimelineProps) => {
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CaseTimelineEvent[]>([]);

  const loadTimeline = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await casesApiClient.getCaseTimeline(caseId);
      setEvents(rows || []);
    } catch {
      showError('Failed to load case timeline');
    } finally {
      setLoading(false);
    }
  }, [caseId, showError]);

  useEffect(() => {
    void loadTimeline();
  }, [loadTimeline, refreshKey]);

  if (loading) {
    return <p className="text-sm text-app-text-muted">Loading timeline...</p>;
  }

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-app-border bg-app-surface-muted p-8 text-center">
        <p className="text-sm text-app-text-muted">No timeline activity yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div key={`${event.type}-${event.id}`} className="rounded-lg border border-app-border bg-app-surface p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs ${eventTypeBadgeClass[event.type]}`}>
              {eventTypeLabel[event.type]}
            </span>
            {event.visible_to_client ? (
              <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">Client visible</span>
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
          {(event.first_name || event.last_name) && (
            <p className="mt-2 text-xs text-app-text-muted">
              {event.first_name || 'Staff'} {event.last_name || ''}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default CaseTimeline;

