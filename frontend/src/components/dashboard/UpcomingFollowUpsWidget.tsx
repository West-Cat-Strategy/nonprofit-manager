/**
 * Upcoming Follow-ups Widget
 * Dashboard widget showing upcoming scheduled follow-ups
 */

import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchUpcomingFollowUps } from '../../store/slices/followUpsSlice';
import type { FollowUpWithEntity } from '../../types/followup';
import { formatDateSmart, formatTimeString } from '../../utils/format';

interface UpcomingFollowUpsWidgetProps {
  limit?: number;
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

export default function UpcomingFollowUpsWidget({ limit = 5 }: UpcomingFollowUpsWidgetProps) {
  const dispatch = useAppDispatch();
  const { upcoming, loading } = useAppSelector((state) => state.followUps);

  useEffect(() => {
    dispatch(fetchUpcomingFollowUps(limit));
  }, [dispatch, limit]);

  return (
    <div className="rounded-2xl border border-app-border/70 bg-app-surface/85 p-5 shadow-sm dark:bg-app-text/85">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-app-text dark:text-white">
          Upcoming Follow-ups
        </h3>
        <Link
          to="/follow-ups"
          className="text-sm font-medium text-app-accent hover:text-app-accent"
        >
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-app-input-border border-t-app-accent rounded-full mx-auto" />
        </div>
      ) : upcoming.length === 0 ? (
        <div className="py-8 text-center text-app-text-muted dark:text-app-text-subtle">
          <p className="text-sm">No upcoming follow-ups</p>
          <p className="text-xs mt-1">Schedule follow-ups from cases or tasks</p>
        </div>
      ) : (
        <div className="space-y-3">
          {upcoming.map((followUp) => {
            const overdue = isOverdue(followUp);

            return (
              <div
                key={followUp.id}
                className={`p-3 rounded-lg border ${
                  overdue
                    ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                    : 'border-app-border bg-app-surface-muted'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Method Icon */}
                  <div className="text-lg flex-shrink-0">
                    {followUp.method ? METHOD_ICONS[followUp.method] : '📋'}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-app-text dark:text-white truncate">
                        {followUp.title}
                      </span>
                      {overdue && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded">
                          Overdue
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-app-text-muted dark:text-app-text-subtle">
                      <span className={overdue ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                        {formatDateSmart(followUp.scheduled_date)}
                        {followUp.scheduled_time && ` at ${formatTimeString(followUp.scheduled_time)}`}
                      </span>
                      <span>•</span>
                      <Link
                        to={getEntityLink(followUp)}
                        className="text-app-accent hover:underline"
                      >
                        {getEntityLabel(followUp)}
                      </Link>
                    </div>
                    {followUp.contact_name && (
                      <div className="mt-1 text-xs text-app-text-muted dark:text-app-text-subtle">
                        {followUp.contact_name}
                      </div>
                    )}
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
