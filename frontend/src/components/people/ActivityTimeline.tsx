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

interface ActivityTimelineProps {
  events: ActivityEvent[];
  loading?: boolean;
  emptyMessage?: string;
}

const getEventIcon = (type: ActivityEventType) => {
  const iconClass = 'w-5 h-5';
  switch (type) {
    case 'created':
      return <CheckCircleIcon className={`${iconClass} text-green-600`} />;
    case 'updated':
      return <PencilIcon className={`${iconClass} text-app-accent`} />;
    case 'deleted':
      return <TrashIcon className={`${iconClass} text-red-600`} />;
    case 'status_changed':
      return <CheckIcon className={`${iconClass} text-yellow-600`} />;
    case 'comment':
      return <ChatBubbleLeftIcon className={`${iconClass} text-purple-600`} />;
    case 'assigned':
      return <LinkIcon className={`${iconClass} text-indigo-600`} />;
    case 'unassigned':
      return <LinkIcon className={`${iconClass} text-app-text-muted`} />;
    case 'status_updated':
      return <CheckIcon className={`${iconClass} text-yellow-600`} />;
    case 'field_changed':
      return <PencilIcon className={`${iconClass} text-app-accent`} />;
    default:
      return <ClockIcon className={`${iconClass} text-app-text-muted`} />;
  }
};

const getEventColor = (type: ActivityEventType) => {
  switch (type) {
    case 'created':
      return 'bg-green-50 border-green-200';
    case 'updated':
      return 'bg-app-accent-soft border-app-accent-soft';
    case 'deleted':
      return 'bg-red-50 border-red-200';
    case 'status_changed':
      return 'bg-yellow-50 border-yellow-200';
    case 'comment':
      return 'bg-purple-50 border-purple-200';
    case 'assigned':
      return 'bg-indigo-50 border-indigo-200';
    case 'unassigned':
      return 'bg-app-surface-muted border-app-border';
    case 'status_updated':
      return 'bg-yellow-50 border-yellow-200';
    case 'field_changed':
      return 'bg-app-accent-soft border-app-accent-soft';
    default:
      return 'bg-app-surface-muted border-app-border';
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
      <div className="space-y-4">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="animate-pulse flex gap-4 pb-4 border-b border-app-border">
            <div className="w-10 h-10 bg-app-surface-muted rounded-full flex-shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-app-surface-muted rounded w-3/4"></div>
              <div className="h-3 bg-app-surface-muted rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <ClockIcon className="w-12 h-12 text-app-text-subtle mx-auto mb-3" />
        <p className="text-app-text-muted font-mono text-sm">{emptyMessage}</p>
      </div>
    );
  }

  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-6">
      {sortedEvents.map((event, index) => (
        <div
          key={event.id}
          className={`border-l-4 border-app-text pl-4 pb-4 ${
            index !== sortedEvents.length - 1 ? 'border-b border-app-border pb-4' : ''
          }`}
        >
          {/* Event Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-shrink-0">
                {getEventIcon(event.type)}
              </div>
              <div>
                <h4 className="font-bold text-app-text text-sm">{event.title}</h4>
                {event.user && (
                  <p className="text-xs text-app-text-muted font-mono mt-0.5">
                    By {event.user.name}
                    {event.user.email && ` (${event.user.email})`}
                  </p>
                )}
              </div>
            </div>
            <time className="text-xs text-app-text-muted whitespace-nowrap ml-2">
              {formatTimeAgo(new Date(event.timestamp))}
            </time>
          </div>

          {/* Event Description */}
          {event.description && (
            <p className="text-sm text-app-text-muted ml-8 mb-2">
              {event.description}
            </p>
          )}

          {/* Event Details - Field Changes */}
          {event.details && Object.keys(event.details).length > 0 && (
            <div className="ml-8 bg-app-surface-muted border border-app-border rounded p-3 text-xs font-mono space-y-2">
              {Object.entries(event.details).map(([field, change]) => (
                <div key={field} className="border-b border-app-border last:border-b-0 pb-2 last:pb-0">
                  <div className="text-app-text-muted font-bold mb-1">
                    {field.replace(/_/g, ' ')}
                  </div>
                  <div className="ml-2 space-y-1">
                    {change.oldValue !== undefined && (
                      <div className="text-red-700">
                        <span className="text-red-500 mr-1">−</span>
                        {String(change.oldValue)}
                      </div>
                    )}
                    {change.newValue !== undefined && (
                      <div className="text-green-700">
                        <span className="text-green-500 mr-1">+</span>
                        {String(change.newValue)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Metadata Tags */}
          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div className="ml-8 mt-3 flex flex-wrap gap-2">
              {Object.entries(event.metadata).map(([key, value]) => (
                <span
                  key={key}
                  className="text-xs bg-app-surface-muted border border-app-input-border px-2 py-1 rounded font-mono"
                >
                  <span className="text-app-text-muted">{key}:</span> {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
