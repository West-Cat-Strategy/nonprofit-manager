/**
 * Activity Timeline Component
 * Display a timeline of activities/changes for a record with detailed change tracking
 */

import React from 'react';
import {
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  ChatBubbleLeftIcon,
  LinkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import type { ActivityEvent, ActivityEventType } from '../../types/people';
import { BrutalCard } from '../neo-brutalist';

interface ActivityTimelineProps {
  events: ActivityEvent[];
  loading?: boolean;
  emptyMessage?: string;
}

const getEventIcon = (type: ActivityEventType) => {
  const iconClass = 'w-6 h-6 stroke-[3px]';
  switch (type) {
    case 'created':
      return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
    case 'updated':
      return <PencilIcon className={`${iconClass} text-[var(--app-accent)]`} />;
    case 'deleted':
      return <TrashIcon className={`${iconClass} text-red-600`} />;
    case 'status_changed':
    case 'status_updated':
      return <CheckIcon className={`${iconClass} text-yellow-600`} />;
    case 'comment':
      return <ChatBubbleLeftIcon className={`${iconClass} text-purple-600`} />;
    case 'assigned':
      return <LinkIcon className={`${iconClass} text-indigo-600`} />;
    case 'unassigned':
      return <LinkIcon className={`${iconClass} text-[var(--app-text-muted)]`} />;
    case 'field_changed':
      return <PencilIcon className={`${iconClass} text-[var(--app-accent)]`} />;
    default:
      return <ClockIcon className={`${iconClass} text-[var(--app-text-muted)]`} />;
  }
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  return new Date(date).toLocaleDateString();
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  events,
  loading = false,
  emptyMessage = 'No activities yet',
}) => {
  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="animate-pulse flex gap-6 pb-6 border-b-4 border-[var(--app-border)] last:border-b-0">
            <div className="w-12 h-12 bg-[var(--app-surface-muted)] border-4 border-black flex-shrink-0 transform rotate-3"></div>
            <div className="flex-1 space-y-3">
              <div className="h-6 bg-[var(--app-surface-muted)] border-2 border-black w-3/4"></div>
              <div className="h-4 bg-[var(--app-surface-muted)] border-2 border-black w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16 bg-[var(--app-surface-muted)] border-4 border-dashed border-[var(--app-border)]">
        <ClockIcon className="w-16 h-16 text-[var(--app-text-muted)] mx-auto mb-4" />
        <p className="text-[var(--app-text-muted)] font-black uppercase tracking-widest text-lg">{emptyMessage}</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-8 relative before:absolute before:left-[1.45rem] before:top-4 before:bottom-4 before:w-1 before:bg-black">
      {sortedEvents.map((event) => (
        <div
          key={event.id}
          className="relative pl-12 pb-2"
        >
          {/* Timeline Node */}
          <div className="absolute left-0 top-0 w-12 h-12 bg-white border-4 border-black flex items-center justify-center z-10 shadow-[4px_4px_0px_0px_var(--shadow-color)] transform -rotate-3">
            {getEventIcon(event.type)}
          </div>

          <BrutalCard className="p-6 border-4 border-black bg-[var(--app-surface)] shadow-[8px_8px_0px_0px_var(--shadow-color)] transform rotate-1">
            {/* Event Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
              <div>
                <h4 className="font-black uppercase tracking-tight text-[var(--app-text)] text-lg leading-none">
                  {event.title}
                </h4>
                {event.user && (
                  <p className="text-sm font-black uppercase text-[var(--app-text-muted)] mt-1 tracking-widest">
                    By {event.user.name}
                  </p>
                )}
              </div>
              <time className="text-xs font-black uppercase bg-black text-white px-3 py-1 self-start md:self-center transform -rotate-2">
                {formatTimeAgo(new Date(event.timestamp))}
              </time>
            </div>

            {/* Event Description */}
            {event.description && (
              <p className="text-[var(--app-text)] font-medium mb-4 italic border-l-4 border-[var(--app-accent)] pl-4">
                {event.description}
              </p>
            )}

            {/* Event Details - Field Changes */}
            {event.details && Object.keys(event.details).length > 0 && (
              <div className="bg-[var(--app-surface-muted)] border-4 border-black p-4 space-y-3">
                {Object.entries(event.details).map(([field, change]) => (
                  <div key={field} className="border-b-2 border-black last:border-b-0 pb-3 last:pb-0">
                    <div className="text-[var(--app-text-muted)] font-black uppercase text-xs mb-2 tracking-widest">
                      {field.replace(/_/g, ' ')}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {change.oldValue !== undefined && (
                        <div className="bg-red-100 border-2 border-red-900 p-2 text-red-900 font-black flex items-center gap-2">
                          <span className="text-2xl leading-none">−</span>
                          <span className="truncate">{String(change.oldValue)}</span>
                        </div>
                      )}
                      {change.newValue !== undefined && (
                        <div className="bg-green-100 border-2 border-green-900 p-2 text-green-900 font-black flex items-center gap-2">
                          <span className="text-2xl leading-none">+</span>
                          <span className="truncate">{String(change.newValue)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Metadata Tags */}
            {event.metadata && Object.keys(event.metadata).length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {Object.entries(event.metadata).map(([key, value]) => (
                  <span
                    key={key}
                    className="text-xs bg-black text-white px-3 py-1 font-black uppercase tracking-widest"
                  >
                    {key}: {String(value)}
                  </span>
                ))}
              </div>
            )}
          </BrutalCard>
        </div>
      ))}
    </div>
  );
};
