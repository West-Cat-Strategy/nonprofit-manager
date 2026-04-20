import { Link } from 'react-router-dom';
import { useEntityActivities } from '../../activities/hooks';
import type { ActivityRecord } from '../../activities/types';
import { formatDateTime } from '../../../utils/format';

interface ContactActivityPanelProps {
  contactId: string;
}

const activityIcons: Record<string, string> = {
  contact_note_added: 'Note',
  case_created: 'Case',
  donation_received: 'Donation',
  event_registration: 'RSVP',
  event_registration_updated: 'RSVP Update',
  event_check_in: 'Check-In',
  task_created: 'Task',
  document_uploaded: 'Document',
  conversation_resolved: 'Portal',
  appointment_scheduled: 'Appointment',
  appointment_completed: 'Appointment',
  appointment_cancelled: 'Appointment',
  follow_up_completed: 'Follow-up',
  attendance_recorded: 'Attendance',
};

const getMetadataValue = (metadata: Record<string, unknown> | undefined, key: string): string | undefined => {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
};

const resolveActivityLink = (activity: ActivityRecord): string | null => {
  if (activity.entity_type === 'case') {
    return `/cases/${activity.entity_id}`;
  }

  if (activity.entity_type === 'donation') {
    return `/donations/${activity.entity_id}`;
  }

  if (activity.entity_type === 'task') {
    return `/tasks/${activity.entity_id}`;
  }

  if (activity.entity_type === 'event') {
    const eventId = getMetadataValue(activity.metadata, 'event_id') || activity.entity_id;
    return `/events/${eventId}`;
  }

  if (activity.entity_type === 'attendance') {
    const eventId = getMetadataValue(activity.metadata, 'event_id');
    const caseId = getMetadataValue(activity.metadata, 'case_id');
    if (eventId) {
      return `/events/${eventId}`;
    }
    if (caseId) {
      return `/cases/${caseId}`;
    }
  }

  if (activity.entity_type === 'appointment') {
    const caseId = getMetadataValue(activity.metadata, 'case_id');
    if (caseId) {
      return `/cases/${caseId}`;
    }
  }

  if (activity.entity_type === 'follow_up') {
    const parentType = getMetadataValue(activity.metadata, 'entity_type');
    const parentId = getMetadataValue(activity.metadata, 'entity_id');
    if (parentType === 'case' && parentId) {
      return `/cases/${parentId}`;
    }
    if (parentType === 'event' && parentId) {
      return `/events/${parentId}`;
    }
    if (parentType === 'task' && parentId) {
      return `/tasks/${parentId}`;
    }
  }

  return null;
};

export default function ContactActivityPanel({ contactId }: ContactActivityPanelProps) {
  const { activities, loading, error, refresh } = useEntityActivities({
    entityType: 'contact',
    entityId: contactId,
  });
  const errorMessage = error ? 'Failed to load the activity timeline.' : null;

  if (loading) {
    return (
      <div className="space-y-3" aria-label="Loading activity">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-24 animate-pulse rounded-lg border border-app-border bg-app-surface-muted"
          />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex flex-col gap-3 border-2 border-black bg-app-accent-soft p-4 md:flex-row md:items-center md:justify-between">
        <p className="text-sm font-bold text-app-accent-text">{errorMessage}</p>
        <button
          type="button"
          onClick={() => void refresh()}
          className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="border-2 border-dashed border-black/30 bg-white px-6 py-10 text-center">
        <p className="text-sm font-black uppercase text-black/60">No activity yet</p>
        <p className="mt-2 text-sm font-bold text-black/70">
          Notes, tasks, appointments, follow-up outcomes, donations, and check-ins will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const activityLink = resolveActivityLink(activity);

        return (
          <div
            key={activity.id}
            className="border-2 border-black bg-white p-4 shadow-[2px_2px_0px_var(--shadow-color)]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-[var(--loop-yellow)] px-2 py-1 text-xs font-black uppercase text-black">
                    {activityIcons[activity.type] || 'Activity'}
                  </span>
                  <span className="text-xs font-black uppercase text-black/60">
                    {formatDateTime(activity.timestamp)}
                  </span>
                </div>
                <div>
                  <p className="text-base font-black text-black">{activity.title}</p>
                  {activity.description && (
                    <p className="mt-1 text-sm font-bold text-black/70">{activity.description}</p>
                  )}
                  {activity.user_name && (
                    <p className="mt-2 text-xs font-bold uppercase text-black/50">
                      Recorded by {activity.user_name}
                    </p>
                  )}
                </div>
              </div>

              {activityLink && (
                <Link
                  to={activityLink}
                  className="px-3 py-2 text-xs font-black uppercase border-2 border-black bg-white hover:bg-[var(--loop-yellow)]"
                >
                  Open Related Record
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
