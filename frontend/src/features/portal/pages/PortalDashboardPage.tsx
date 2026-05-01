import { useEffect, useState } from 'react';
import {
  BellIcon,
  BriefcaseIcon,
  CalendarDaysIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  FolderOpenIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import PortalPageState from '../../../components/portal/PortalPageState';
import PortalPageShell from '../../../components/portal/PortalPageShell';
import PortalListCard from '../../../components/portal/PortalListCard';
import { SectionCard, StatCard } from '../../../components/ui';
import { portalV2ApiClient } from '../api/portalApiClient';
import type { PortalDashboardData } from '../types/contracts';
import { usePersistentPortalCaseContext } from '../../../hooks/usePersistentPortalCaseContext';
import { getPortalEventOccurrenceLabel } from '../utils/eventDisplay';
import { formatPortalDateTime } from '../utils/dateDisplay';

const formatDateTime = (value?: string | null): string =>
  formatPortalDateTime(value, undefined, 'Not scheduled');

const quickActionClass =
  'inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-sm)] border px-4 py-2 text-sm font-semibold shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-app-accent';
const quietActionClass =
  'border-app-border text-app-text hover:border-app-accent hover:bg-app-surface-muted';
const cardActionClass =
  'inline-flex items-center gap-1.5 rounded border border-app-input-border px-3 py-1 text-xs font-medium transition-colors duration-150 hover:border-app-accent hover:bg-app-surface-muted';

export default function PortalDashboard() {
  const [dashboard, setDashboard] = useState<PortalDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setSelectedCaseId } = usePersistentPortalCaseContext();

  const load = async () => {
    try {
      setError(null);
      const response = await portalV2ApiClient.getDashboard();
      setDashboard(response);
    } catch (err) {
      console.error('Failed to load portal dashboard', err);
      setError('Unable to load your portal home right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const activeCases = dashboard?.active_cases ?? [];
  const recentThreads = dashboard?.recent_threads ?? [];
  const reminders = dashboard?.reminders ?? [];
  const recentDocuments = dashboard?.recent_documents ?? [];
  const upcomingEvents = dashboard?.upcoming_events ?? [];
  const nextAppointment = dashboard?.next_appointment ?? null;
  const recentActivity = dashboard?.recent_activity ?? [];
  const primaryCase = activeCases[0] ?? null;
  const hasContent =
    activeCases.length > 0 ||
    recentThreads.length > 0 ||
    reminders.length > 0 ||
    recentDocuments.length > 0 ||
    upcomingEvents.length > 0 ||
    nextAppointment !== null;

  return (
    <PortalPageShell
      title="Your Portal Home"
      description="Pick up conversations, appointments, documents, and next steps from one place."
    >
      <PortalPageState
        loading={loading}
        error={error}
        empty={!loading && !error && !hasContent}
        loadingLabel="Loading your portal home..."
        emptyTitle="Your portal is ready when staff share items with you."
        emptyDescription="Once a case, conversation, appointment, or document is shared, it will appear here."
        emptyIcon={<FolderOpenIcon className="h-5 w-5" aria-hidden="true" />}
        onRetry={load}
      />

      {!loading && !error && dashboard && (
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Shared Cases"
              value={activeCases.length}
              trend={
                primaryCase ? `Most recent: ${primaryCase.title}` : 'No active shared cases yet'
              }
            />
            <StatCard
              label="Unread Conversations"
              value={dashboard.unread_threads_count}
              trend={
                recentThreads[0]
                  ? `Latest update: ${formatDateTime(recentThreads[0].last_message_at)}`
                  : 'No conversations yet'
              }
            />
            <StatCard
              label="Next Appointment"
              value={nextAppointment ? formatDateTime(nextAppointment.start_time) : 'None'}
              trend={
                nextAppointment?.case_title
                  ? `${nextAppointment.case_title}${nextAppointment.location ? ` • ${nextAppointment.location}` : ''}`
                  : 'Book a time or send a request'
              }
            />
            <StatCard
              label="Upcoming Events"
              value={upcomingEvents.length}
              trend={
                upcomingEvents[0]
                  ? `${upcomingEvents[0].name}${
                      getPortalEventOccurrenceLabel(upcomingEvents[0])
                        ? ` • ${getPortalEventOccurrenceLabel(upcomingEvents[0])}`
                        : ''
                    }`
                  : 'No upcoming events'
              }
            />
          </div>

          <SectionCard
            title="Quick Actions"
            subtitle="Jump back into the most common client tasks."
          >
            <div className="flex flex-wrap gap-3">
              {primaryCase ? (
                <Link
                  to={`/portal/cases/${primaryCase.id}`}
                  onClick={() => setSelectedCaseId(primaryCase.id)}
                  className={`${quickActionClass} app-accent-contrast-ink border-app-accent bg-app-accent`}
                >
                  <BriefcaseIcon className="h-4 w-4" aria-hidden="true" />
                  Open Case
                </Link>
              ) : (
                <Link
                  to="/portal/cases"
                  className={`${quickActionClass} ${quietActionClass}`}
                >
                  <FolderOpenIcon className="h-4 w-4" aria-hidden="true" />
                  View Shared Cases
                </Link>
              )}
              <Link
                to="/portal/messages"
                className={`${quickActionClass} ${quietActionClass}`}
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" aria-hidden="true" />
                Message Staff
              </Link>
              <Link
                to="/portal/appointments"
                className={`${quickActionClass} ${quietActionClass}`}
              >
                <CalendarDaysIcon className="h-4 w-4" aria-hidden="true" />
                Manage Appointments
              </Link>
              <Link
                to="/portal/documents"
                className={`${quickActionClass} ${quietActionClass}`}
              >
                <DocumentTextIcon className="h-4 w-4" aria-hidden="true" />
                Shared Documents
              </Link>
            </div>
          </SectionCard>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <SectionCard
              title="Resume A Shared Case"
              subtitle="Each shared case keeps its timeline, documents, appointments, and conversations together."
              actions={
                <Link
                  to="/portal/cases"
                  className="text-sm font-medium text-app-accent hover:underline"
                >
                  View all cases
                </Link>
              }
            >
              {activeCases.length === 0 ? (
                <p className="text-sm text-app-text-muted">No shared cases are available yet.</p>
              ) : (
                <div className="space-y-3">
                  {activeCases.map((item) => (
                    <PortalListCard
                      key={item.id}
                      icon={<BriefcaseIcon className="h-5 w-5" aria-hidden="true" />}
                      title={item.title}
                      subtitle={item.case_number}
                      meta={`Updated ${formatDateTime(item.updated_at)}`}
                      badges={
                        <>
                          {item.status_name && (
                            <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                              {item.status_name}
                            </span>
                          )}
                          {item.case_type_name && (
                            <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted">
                              {item.case_type_name}
                            </span>
                          )}
                        </>
                      }
                      actions={
                        <Link
                          to={`/portal/cases/${item.id}`}
                          onClick={() => setSelectedCaseId(item.id)}
                          className={cardActionClass}
                        >
                          Open case
                        </Link>
                      }
                    >
                      {item.description && (
                        <p className="line-clamp-2 whitespace-pre-wrap text-sm text-app-text-muted">
                          {item.description}
                        </p>
                      )}
                    </PortalListCard>
                  ))}
                </div>
              )}
            </SectionCard>

            <div className="space-y-5">
              <SectionCard
                title="Recent Conversations"
                subtitle="Unread or recently updated conversations with your assigned staff."
                actions={
                  <Link
                    to="/portal/messages"
                    className="text-sm font-medium text-app-accent hover:underline"
                  >
                    Open messages
                  </Link>
                }
              >
                {recentThreads.length === 0 ? (
                  <p className="text-sm text-app-text-muted">No conversations have started yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentThreads.map((thread) => (
                      <PortalListCard
                        key={thread.id}
                        icon={<ChatBubbleLeftRightIcon className="h-5 w-5" aria-hidden="true" />}
                        title={thread.subject || thread.case_title || 'Conversation'}
                        subtitle={thread.case_number || 'General support'}
                        meta={formatDateTime(thread.last_message_at)}
                        badges={
                          <>
                            <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted capitalize">
                              {thread.status}
                            </span>
                            {thread.unread_count > 0 && (
                              <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text">
                                {thread.unread_count} unread
                              </span>
                            )}
                          </>
                        }
                      >
                        {thread.last_message_preview && (
                          <p className="line-clamp-2 text-sm text-app-text-muted">
                            {thread.last_message_preview}
                          </p>
                        )}
                      </PortalListCard>
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard title="Next Steps" subtitle="Your nearest appointment and reminders.">
                <div className="space-y-3">
                  <PortalListCard
                    icon={<CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />}
                    title={nextAppointment?.title || 'No appointment scheduled'}
                    subtitle={nextAppointment?.case_title || 'Appointments'}
                    meta={
                      nextAppointment
                        ? formatDateTime(nextAppointment.start_time)
                        : 'Request or book one when needed'
                    }
                    badges={
                      nextAppointment?.status ? (
                        <span className="rounded bg-app-surface-muted px-2 py-0.5 text-xs text-app-text-muted capitalize">
                          {nextAppointment.status}
                        </span>
                      ) : undefined
                    }
                  >
                    {nextAppointment?.description && (
                      <p className="text-sm text-app-text-muted">{nextAppointment.description}</p>
                    )}
                  </PortalListCard>

                  {reminders.length === 0 ? (
                    <p className="text-sm text-app-text-muted">No reminders are due yet.</p>
                  ) : (
                    reminders
                      .slice(0, 3)
                      .map((reminder) => (
                        <PortalListCard
                          key={`${reminder.type}-${reminder.id}`}
                          icon={<BellIcon className="h-5 w-5" aria-hidden="true" />}
                          title={reminder.title}
                          subtitle={reminder.type.toUpperCase()}
                          meta={formatDateTime(reminder.date)}
                        />
                      ))
                  )}
                </div>
              </SectionCard>
            </div>
          </div>

          <SectionCard
            title="Recent Activity"
            subtitle="The latest updates across all your shared cases, appointments, and documents."
          >
            {recentActivity.length === 0 ? (
              <p className="text-sm text-app-text-muted">No recent activity to show.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {recentActivity.map((event) => (
                  <PortalListCard
                    key={`${event.type}-${event.id}`}
                    icon={
                      event.type === 'appointment' ? (
                        <CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />
                      ) : event.type === 'document' ? (
                        <DocumentTextIcon className="h-5 w-5" aria-hidden="true" />
                      ) : (
                        <FolderOpenIcon className="h-5 w-5" aria-hidden="true" />
                      )
                    }
                    title={event.title}
                    subtitle={event.case_title || event.type.toUpperCase()}
                    meta={formatDateTime(event.created_at)}
                    badges={
                      event.type === 'appointment' && event.metadata?.status ? (
                        <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text capitalize">
                          {event.metadata.status as string}
                        </span>
                      ) : undefined
                    }
                  >
                    {event.content && (
                      <p className="line-clamp-2 text-sm text-app-text-muted">{event.content}</p>
                    )}
                  </PortalListCard>
                ))}
              </div>
            )}
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard
              title="Recently Shared Documents"
              subtitle="Staff-shared documents available in your portal."
              actions={
                <Link
                  to="/portal/documents"
                  className="text-sm font-medium text-app-accent hover:underline"
                >
                  View documents
                </Link>
              }
            >
              {recentDocuments.length === 0 ? (
                <p className="text-sm text-app-text-muted">No documents have been shared yet.</p>
              ) : (
                <div className="space-y-3">
                  {recentDocuments.map((doc) => (
                    <PortalListCard
                      key={doc.id}
                      icon={<DocumentTextIcon className="h-5 w-5" aria-hidden="true" />}
                      title={doc.title || doc.original_name}
                      subtitle={doc.document_type}
                      meta={`Shared ${formatDateTime(doc.created_at)}`}
                      actions={
                        <a
                          href={portalV2ApiClient.getDocumentDownloadUrl(doc.id)}
                          className={cardActionClass}
                        >
                          Download
                        </a>
                      }
                    >
                      {doc.description && (
                        <p className="text-sm text-app-text-muted">{doc.description}</p>
                      )}
                    </PortalListCard>
                  ))}
                </div>
              )}
            </SectionCard>

            <SectionCard
              title="Upcoming Events"
              subtitle="Published events and registrations that matter to you."
              actions={
                <Link
                  to="/portal/events"
                  className="text-sm font-medium text-app-accent hover:underline"
                >
                  View events
                </Link>
              }
            >
              {upcomingEvents.length === 0 ? (
                <p className="text-sm text-app-text-muted">No upcoming events are visible yet.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map((event) => (
                    <PortalListCard
                      key={event.id}
                      icon={<CalendarDaysIcon className="h-5 w-5" aria-hidden="true" />}
                      title={event.name}
                      subtitle={event.event_type || 'event'}
                      meta={formatDateTime(event.start_date)}
                      badges={
                        event.registration_id ? (
                          <span className="rounded bg-app-accent-soft px-2 py-0.5 text-xs text-app-accent-text">
                            Registered
                          </span>
                        ) : undefined
                      }
                    >
                      {event.description && (
                        <p className="text-sm text-app-text-muted">{event.description}</p>
                      )}
                    </PortalListCard>
                  ))}
                </div>
              )}
            </SectionCard>
          </div>
        </div>
      )}
    </PortalPageShell>
  );
}
