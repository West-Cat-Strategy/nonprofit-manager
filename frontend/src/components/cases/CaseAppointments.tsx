import { useCallback, useEffect, useMemo, useState } from 'react';
import { casesApiClient } from '../../features/cases/api/casesApiClient';
import { useToast } from '../../contexts/useToast';
import type { CaseAppointment } from '../../types/case';
import type { OutcomeDefinition } from '../../types/outcomes';

interface CaseAppointmentsProps {
  caseId: string;
  outcomeDefinitions: OutcomeDefinition[];
  onChanged?: () => void;
}

interface ResolutionDraft {
  appointmentId: string;
  status: 'cancelled' | 'completed';
  resolutionNote: string;
  outcomeDefinitionIds: string[];
  visibleToClient: boolean;
}

const badgeClass = (tone: 'neutral' | 'success' | 'warning' | 'danger'): string => {
  switch (tone) {
    case 'success':
      return 'bg-emerald-100 text-emerald-800';
    case 'warning':
      return 'bg-amber-100 text-amber-800';
    case 'danger':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-app-surface-muted text-app-text-muted';
  }
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return 'Not scheduled';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

export default function CaseAppointments({
  caseId,
  outcomeDefinitions,
  onChanged,
}: CaseAppointmentsProps) {
  const { showError, showSuccess } = useToast();
  const [appointments, setAppointments] = useState<CaseAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [resolutionDraft, setResolutionDraft] = useState<ResolutionDraft | null>(null);

  const activeOutcomeDefinitions = useMemo(
    () => outcomeDefinitions.filter((definition) => definition.is_active),
    [outcomeDefinitions]
  );

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const rows = await casesApiClient.listCaseAppointments(caseId);
      setAppointments(rows);
    } catch (error) {
      console.error('Failed to load case appointments', error);
      showError('Unable to load appointments for this case.');
    } finally {
      setLoading(false);
    }
  }, [caseId, showError]);

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  const refreshAfterMutation = async () => {
    await loadAppointments();
    onChanged?.();
  };

  const handleConfirm = async (appointmentId: string) => {
    try {
      setActionLoading(true);
      await casesApiClient.updateCaseAppointmentStatus(appointmentId, { status: 'confirmed' });
      showSuccess('Appointment confirmed.');
      await refreshAfterMutation();
    } catch (error) {
      console.error('Failed to confirm appointment', error);
      showError('Unable to confirm appointment.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReminder = async (appointmentId: string) => {
    try {
      setActionLoading(true);
      await casesApiClient.sendCaseAppointmentReminder(appointmentId, {
        sendEmail: true,
        sendSms: true,
      });
      showSuccess('Reminder send requested.');
      await refreshAfterMutation();
    } catch (error) {
      console.error('Failed to send appointment reminder', error);
      showError('Unable to send reminder.');
    } finally {
      setActionLoading(false);
    }
  };

  const submitResolution = async () => {
    if (!resolutionDraft) {
      return;
    }

    if (!resolutionDraft.resolutionNote.trim()) {
      showError('Resolution notes are required.');
      return;
    }

    if (resolutionDraft.outcomeDefinitionIds.length === 0) {
      showError('Select at least one outcome.');
      return;
    }

    try {
      setActionLoading(true);
      await casesApiClient.updateCaseAppointmentStatus(resolutionDraft.appointmentId, {
        status: resolutionDraft.status,
        resolution_note: resolutionDraft.resolutionNote.trim(),
        outcome_definition_ids: resolutionDraft.outcomeDefinitionIds,
        outcome_visibility: resolutionDraft.visibleToClient,
      });
      showSuccess(
        resolutionDraft.status === 'completed'
          ? 'Appointment marked attended.'
          : 'Appointment cancelled.'
      );
      setResolutionDraft(null);
      await refreshAfterMutation();
    } catch (error) {
      console.error('Failed to resolve appointment', error);
      showError('Unable to save appointment resolution.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-sm text-app-text-muted">Loading appointments...</div>;
  }

  if (appointments.length === 0) {
    return (
      <div className="rounded-lg border border-app-border bg-app-surface p-6 text-center text-sm text-app-text-muted">
        No appointments are linked to this case yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {appointments.map((appointment) => {
        const hasActiveResolution =
          resolutionDraft !== null && resolutionDraft.appointmentId === appointment.id;

        return (
          <div
            key={appointment.id}
            className="rounded-lg border border-app-border bg-app-surface p-4"
          >
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-app-text">
                    {appointment.title}
                  </h3>
                  <span className={`rounded px-2 py-0.5 text-xs ${badgeClass('neutral')}`}>
                    {appointment.status}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      appointment.attendance_state === 'attended'
                        ? badgeClass('success')
                        : appointment.attendance_state === 'no_show'
                          ? badgeClass('warning')
                          : appointment.attendance_state === 'cancelled'
                            ? badgeClass('danger')
                            : badgeClass('neutral')
                    }`}
                  >
                    {appointment.attendance_state || 'scheduled'}
                  </span>
                  {appointment.missing_note && (
                    <span className={`rounded px-2 py-0.5 text-xs ${badgeClass('warning')}`}>
                      Missing note
                    </span>
                  )}
                  {appointment.missing_outcome && (
                    <span className={`rounded px-2 py-0.5 text-xs ${badgeClass('warning')}`}>
                      Missing outcome
                    </span>
                  )}
                  {appointment.missing_reminder && (
                    <span className={`rounded px-2 py-0.5 text-xs ${badgeClass('warning')}`}>
                      Missing reminder
                    </span>
                  )}
                </div>
                <div className="text-sm text-app-text-muted">
                  {formatDateTime(appointment.start_time)}
                  {appointment.end_time ? ` to ${formatDateTime(appointment.end_time)}` : ''}
                </div>
                <div className="text-xs text-app-text-muted">
                  {appointment.location || 'No location set'}
                  {appointment.contact_name ? ` • ${appointment.contact_name}` : ''}
                  {appointment.pointperson_first_name
                    ? ` • ${appointment.pointperson_first_name} ${appointment.pointperson_last_name || ''}`
                    : ''}
                </div>
                {appointment.description && (
                  <p className="text-sm text-app-text">{appointment.description}</p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-app-text-muted">
                  <span>
                    Reminder offered:{' '}
                    {appointment.reminder_offered ? 'Yes' : 'No'}
                  </span>
                  <span>
                    Pending reminders:{' '}
                    {appointment.pending_reminder_jobs || 0}
                  </span>
                  <span>
                    Last reminder:{' '}
                    {appointment.last_reminder_sent_at
                      ? formatDateTime(appointment.last_reminder_sent_at)
                      : 'None'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {appointment.status === 'requested' && (
                  <button
                    type="button"
                    onClick={() => void handleConfirm(appointment.id)}
                    disabled={actionLoading}
                    className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text disabled:opacity-60"
                  >
                    Confirm
                  </button>
                )}
                {appointment.status === 'confirmed' && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setResolutionDraft({
                          appointmentId: appointment.id,
                          status: 'completed',
                          resolutionNote: '',
                          outcomeDefinitionIds: [],
                          visibleToClient: false,
                        })
                      }
                      disabled={actionLoading}
                      className="rounded-md bg-app-accent px-3 py-2 text-sm text-white disabled:opacity-60"
                    >
                      Mark Attended
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setResolutionDraft({
                          appointmentId: appointment.id,
                          status: 'cancelled',
                          resolutionNote: '',
                          outcomeDefinitionIds: [],
                          visibleToClient: false,
                        })
                      }
                      disabled={actionLoading}
                      className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleReminder(appointment.id)}
                      disabled={actionLoading}
                      className="rounded-md border border-app-input-border bg-app-surface-muted px-3 py-2 text-sm text-app-text disabled:opacity-60"
                    >
                      Send Reminder
                    </button>
                  </>
                )}
              </div>
            </div>

            {hasActiveResolution && resolutionDraft && (
              <div className="mt-4 space-y-3 rounded-lg border border-app-border bg-app-surface-muted p-4">
                <div className="text-sm font-semibold text-app-text">
                  {resolutionDraft.status === 'completed'
                    ? 'Appointment resolution'
                    : 'Cancellation resolution'}
                </div>
                <textarea
                  value={resolutionDraft.resolutionNote}
                  onChange={(event) =>
                    setResolutionDraft((current) =>
                      current
                        ? { ...current, resolutionNote: event.target.value }
                        : current
                    )
                  }
                  rows={3}
                  placeholder="Summarize the appointment and resolution."
                  className="w-full rounded-md border border-app-input-border px-3 py-2"
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeOutcomeDefinitions.map((definition) => {
                    const checked = resolutionDraft.outcomeDefinitionIds.includes(definition.id);
                    return (
                      <label
                        key={definition.id}
                        className="flex items-start gap-2 rounded border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => {
                            setResolutionDraft((current) => {
                              if (!current) return current;
                              return {
                                ...current,
                                outcomeDefinitionIds: event.target.checked
                                  ? [...current.outcomeDefinitionIds, definition.id]
                                  : current.outcomeDefinitionIds.filter((id) => id !== definition.id),
                              };
                            });
                          }}
                          className="mt-0.5"
                        />
                        <span>{definition.name}</span>
                      </label>
                    );
                  })}
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-app-text-muted">
                  <input
                    type="checkbox"
                    checked={resolutionDraft.visibleToClient}
                    onChange={(event) =>
                      setResolutionDraft((current) =>
                        current
                          ? { ...current, visibleToClient: event.target.checked }
                          : current
                      )
                    }
                  />
                  Visible to client
                </label>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionDraft(null)}
                    className="rounded-md border border-app-input-border bg-app-surface px-3 py-2 text-sm text-app-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void submitResolution()}
                    disabled={actionLoading || activeOutcomeDefinitions.length === 0}
                    className="rounded-md bg-app-accent px-3 py-2 text-sm text-white disabled:opacity-60"
                  >
                    Save resolution
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
