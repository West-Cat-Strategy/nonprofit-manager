/**
 * Upcoming Follow-ups Widget
 * Dashboard widget showing upcoming scheduled follow-ups
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchUpcomingFollowUps } from '../../features/followUps/state';
import type { FollowUpWithEntity } from '../../types/followup';
import { formatDateSmart, formatTimeString } from '../../utils/format';
import WidgetContainer from './WidgetContainer';
import type { DashboardWidget } from '../../types/dashboard';
import { useDashboardUpcomingFollowUps } from '../../features/dashboard/context/DashboardDataContext';

interface UpcomingFollowUpsWidgetProps {
  limit?: number;
  widget?: DashboardWidget;
  editMode?: boolean;
  onRemove?: () => void;
}

const METHOD_ICONS: Record<string, string> = {
  phone: '📞',
  email: '✉️',
  in_person: '🤝',
  video_call: '📹',
  other: '📋',
};

function isOverdue(followUp: FollowUpWithEntity): boolean {
  const now = new Date();
  const scheduled = new Date(followUp.scheduled_date);
  if (followUp.scheduled_time) {
    const [hours, minutes] = followUp.scheduled_time.split(':');
    scheduled.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  } else {
    scheduled.setHours(23, 59, 59);
  }
  return now > scheduled;
}

function getEntityLink(followUp: FollowUpWithEntity): string {
  if (followUp.entity_type === 'case') {
    return `/cases/${followUp.entity_id}`;
  }
  return `/tasks/${followUp.entity_id}`;
}

function getEntityLabel(followUp: FollowUpWithEntity): string {
  if (followUp.entity_type === 'case') {
    return followUp.case_number || `Case #${followUp.entity_id.slice(0, 8)}`;
  }
  return followUp.task_subject || `Task #${followUp.entity_id.slice(0, 8)}`;
}

function UpcomingFollowUpsWidgetContent({
  items,
  loading,
  framed,
}: {
  items: FollowUpWithEntity[];
  loading: boolean;
  framed: boolean;
}) {
  return (
    <div className={framed ? 'rounded-2xl border border-app-border/70 bg-app-surface/85 p-5 shadow-sm dark:bg-app-text/85' : ''}>
      {framed ? (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-app-text dark:text-white">Upcoming Follow-ups</h3>
          <Link to="/follow-ups" className="text-sm font-medium text-app-accent hover:text-app-accent">
            View all →
          </Link>
        </div>
      ) : (
        <div className="mb-4 flex justify-end">
          <Link to="/follow-ups" className="text-sm font-medium text-app-accent hover:text-app-accent">
            View all →
          </Link>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-app-input-border border-t-app-accent" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-app-text-muted dark:text-app-text-subtle">
          <p className="text-sm">No upcoming follow-ups</p>
          <p className="mt-1 text-xs">Schedule follow-ups from cases or tasks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((followUp) => {
            const overdue = isOverdue(followUp);

            return (
              <div
                key={followUp.id}
                className={`rounded-lg border p-3 ${
                  overdue
                    ? 'border-app-border bg-app-accent-soft dark:border-app-accent dark:bg-app-accent-hover/20'
                    : 'border-app-border bg-app-surface-muted'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-lg flex-shrink-0">
                    {followUp.method ? METHOD_ICONS[followUp.method] : '📋'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium text-app-text dark:text-white">
                        {followUp.title}
                      </span>
                      {overdue ? (
                        <span className="rounded bg-app-accent-soft px-1.5 py-0.5 text-xs font-medium text-app-accent-text dark:bg-app-accent-hover dark:text-app-text-muted">
                          Overdue
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-app-text-muted dark:text-app-text-subtle">
                      <span className={overdue ? 'font-medium text-app-accent dark:text-app-text-muted' : ''}>
                        {formatDateSmart(followUp.scheduled_date)}
                        {followUp.scheduled_time ? ` at ${formatTimeString(followUp.scheduled_time)}` : ''}
                      </span>
                      <span>•</span>
                      <Link to={getEntityLink(followUp)} className="text-app-accent hover:underline">
                        {getEntityLabel(followUp)}
                      </Link>
                    </div>
                    {followUp.contact_name ? (
                      <div className="mt-1 text-xs text-app-text-muted dark:text-app-text-subtle">
                        {followUp.contact_name}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function UpcomingFollowUpsWidget({
  limit = 5,
  widget,
  editMode = false,
  onRemove,
}: UpcomingFollowUpsWidgetProps) {
  const upcomingFollowUpsLane = useDashboardUpcomingFollowUps();
  const dispatch = useAppDispatch();
  const { upcoming, loading } = useAppSelector((state) => state.followUps);

  useEffect(() => {
    if (upcomingFollowUpsLane) {
      return;
    }
    dispatch(fetchUpcomingFollowUps(limit));
  }, [dispatch, limit, upcomingFollowUpsLane]);

  const items = upcomingFollowUpsLane ? upcomingFollowUpsLane.upcomingFollowUps : upcoming;
  const isLoading = upcomingFollowUpsLane ? upcomingFollowUpsLane.loading : loading;
  const error = upcomingFollowUpsLane?.error ?? undefined;
  const content = <UpcomingFollowUpsWidgetContent items={items} loading={isLoading} framed={!widget} />;

  if (widget && onRemove) {
    return (
      <WidgetContainer
        widget={widget}
        editMode={editMode}
        onRemove={onRemove}
        loading={isLoading}
        error={error}
      >
        {content}
      </WidgetContainer>
    );
  }

  return content;
}
