import { Fragment, Suspense, lazy } from 'react';
import { Link } from 'react-router-dom';
import type { EventRegistration, RegistrationStatus } from '../../../types/event';
import {
  confirmationEmailEligibleStatuses,
  formatRegistrationStatus,
  nonAttendableStatuses,
} from './eventRegistrationsPanelShared';
import type { RegistrationCaseOption, RegistrationManageDraft } from './eventRegistrationsPanelShared';

const EventQrScanner = lazy(() => import('./EventQrScanner'));

interface EventRegistrationTableProps {
  actionLoading: boolean;
  cameraScannerOpen: boolean;
  caseOptionsByContact: Record<string, RegistrationCaseOption[]>;
  caseOptionsLoadingContactId: string | null;
  closeManageRegistration: () => void;
  confirmationEmailLoadingId: string | null;
  editingRegistrationId: string | null;
  filteredRegistrations: EventRegistration[];
  handleCameraTokenScanned: (token: string) => void;
  handleSendConfirmationEmail: (registrationId: string) => void;
  manageDraft: RegistrationManageDraft | null;
  manageError: string | null;
  manageMessage: string | null;
  onCancelRegistration: (registrationId: string) => Promise<void>;
  onCheckIn: (registrationId: string) => Promise<void>;
  onOpenManageRegistration: (registration: EventRegistration) => void;
  onScanCheckIn?: (token: string) => Promise<void>;
  onSendConfirmationEmail?: (registrationId: string) => Promise<void>;
  registrationFilter: string;
  registrationSearch: string;
  qrCodesByRegistration: Record<string, string>;
  scanError: string | null;
  scanStatusMessage: string | null;
  scanToken: string;
  setCameraScannerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setManageDraft: React.Dispatch<React.SetStateAction<RegistrationManageDraft | null>>;
  setRegistrationFilter: (value: string) => void;
  setRegistrationSearch: (value: string) => void;
  setScanToken: (value: string) => void;
  submitManageRegistration: () => void;
  submitScanCheckIn: (token: string) => Promise<void>;
}

export function EventRegistrationTable({
  actionLoading,
  cameraScannerOpen,
  caseOptionsByContact,
  caseOptionsLoadingContactId,
  closeManageRegistration,
  confirmationEmailLoadingId,
  editingRegistrationId,
  filteredRegistrations,
  handleCameraTokenScanned,
  handleSendConfirmationEmail,
  manageDraft,
  manageError,
  manageMessage,
  onCancelRegistration,
  onCheckIn,
  onOpenManageRegistration,
  onScanCheckIn,
  onSendConfirmationEmail,
  registrationFilter,
  registrationSearch,
  qrCodesByRegistration,
  scanError,
  scanStatusMessage,
  scanToken,
  setCameraScannerOpen,
  setManageDraft,
  setRegistrationFilter,
  setRegistrationSearch,
  setScanToken,
  submitManageRegistration,
  submitScanCheckIn,
}: EventRegistrationTableProps) {
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h3 className="text-lg font-semibold">Event Registrations</h3>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          {onScanCheckIn && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <input
                  value={scanToken}
                  onChange={(event) => setScanToken(event.target.value)}
                  placeholder="Scan token"
                  className="rounded-md border px-3 py-2"
                />
                <button
                  type="button"
                  disabled={!scanToken.trim() || actionLoading}
                  onClick={() => {
                    const token = scanToken.trim();
                    if (!token) return;
                    void submitScanCheckIn(token).then(() => {
                      setScanToken('');
                    });
                  }}
                  className="rounded-md bg-app-accent px-3 py-2 text-xs text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-50"
                >
                  QR Check-In
                </button>
                <button
                  type="button"
                  onClick={() => setCameraScannerOpen((current) => !current)}
                  className="rounded-md border px-3 py-2 text-xs hover:bg-app-surface-muted"
                >
                  {cameraScannerOpen ? 'Close Camera' : 'Open Camera'}
                </button>
              </div>
              {scanStatusMessage && <p className="text-xs text-app-accent">{scanStatusMessage}</p>}
              {scanError && <p className="text-xs text-app-accent-text">{scanError}</p>}
              {cameraScannerOpen && (
                <Suspense fallback={<div className="mt-2 rounded-md border border-app-border bg-app-surface p-3 text-xs text-app-text-muted">Initializing camera scanner...</div>}>
                  <EventQrScanner
                    enabled={cameraScannerOpen}
                    disabled={actionLoading}
                    onTokenScanned={handleCameraTokenScanned}
                  />
                </Suspense>
              )}
            </div>
          )}
          <input
            value={registrationSearch}
            onChange={(event) => setRegistrationSearch(event.target.value)}
            placeholder="Search attendee or token"
            className="rounded-md border px-3 py-2"
          />
          <select
            value={registrationFilter}
            onChange={(event) => setRegistrationFilter(event.target.value)}
            className="rounded-md border px-4 py-2"
          >
            <option value="">All Statuses</option>
            <option value="registered">Registered</option>
            <option value="waitlisted">Waitlisted</option>
            <option value="confirmed">Confirmed</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {filteredRegistrations.length === 0 ? (
        <div className="py-8 text-center text-app-text-muted">No registrations found for this event.</div>
      ) : (
        <div className="overflow-x-auto">
          {(manageError || manageMessage) && (
            <div className="mb-4 rounded-md border border-app-border bg-app-surface-muted p-3 text-sm">
              {manageError ? (
                <p className="text-app-accent-text">{manageError}</p>
              ) : (
                <p className="text-app-accent">{manageMessage}</p>
              )}
            </div>
          )}
          <table className="min-w-full divide-y divide-app-border">
            <thead className="bg-app-surface-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">QR Check-In</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Checked In</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Registered At</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-app-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border bg-app-surface">
              {filteredRegistrations.map((registration) => {
                const isManaging = editingRegistrationId === registration.registration_id;
                const caseOptions = caseOptionsByContact[registration.contact_id] || [];
                const manageLoading = caseOptionsLoadingContactId === registration.contact_id;
                const canCheckIn =
                  !registration.checked_in &&
                  !nonAttendableStatuses.has(registration.registration_status);
                const checkInUnavailableReason =
                  registration.checked_in
                    ? 'Already checked in'
                    : registration.registration_status === 'waitlisted'
                      ? 'Waitlisted contacts cannot check in'
                      : registration.registration_status === 'no_show'
                        ? 'No-show contacts cannot check in'
                        : registration.registration_status === 'cancelled'
                          ? 'Cancelled registrations cannot check in'
                          : null;
                const linkedCase = caseOptions.find((caseOption) => caseOption.id === registration.case_id);

                return (
                  <Fragment key={registration.registration_id}>
                    <tr>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-medium text-app-text">{registration.contact_name}</div>
                        <div className="text-sm text-app-text-muted">{registration.contact_email}</div>
                        {registration.occurrence_name && (
                          <p className="mt-1 text-xs text-app-text-muted">{registration.occurrence_name}</p>
                        )}
                        {registration.confirmation_email_status && (
                          <p className="mt-1 text-xs text-app-text-muted">
                            Confirmation email:{' '}
                            <span className="font-medium text-app-text">
                              {registration.confirmation_email_status}
                            </span>
                          </p>
                        )}
                        {registration.confirmation_email_sent_at && (
                          <p className="mt-1 text-xs text-app-text-muted">
                            Sent {new Date(registration.confirmation_email_sent_at).toLocaleString()}
                          </p>
                        )}
                        {registration.notes && (
                          <p className="mt-2 max-w-sm whitespace-pre-wrap text-xs text-app-text-muted">
                            {registration.notes}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Link
                            to={`/contacts/${registration.contact_id}`}
                            className="text-xs font-semibold text-app-accent hover:text-app-accent-text"
                          >
                            Open Contact
                          </Link>
                          {registration.case_id && (
                            <Link
                              to={`/cases/${registration.case_id}`}
                              className="text-xs font-semibold text-app-accent hover:text-app-accent-text"
                            >
                              Open Case
                            </Link>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {registration.check_in_token ? (
                          <div className="flex items-center gap-3">
                            {qrCodesByRegistration[registration.registration_id] ? (
                              <img
                                src={qrCodesByRegistration[registration.registration_id]}
                                alt="Check-in QR"
                                className="h-14 w-14 rounded border border-app-border bg-white p-1"
                              />
                            ) : (
                              <div className="h-14 w-14 rounded border border-app-border bg-app-surface-muted" />
                            )}
                            <div className="max-w-[240px]">
                              <div className="truncate text-xs text-app-text-muted font-mono">
                                {registration.check_in_token}
                              </div>
                              <button
                                type="button"
                                onClick={() => void navigator.clipboard?.writeText(registration.check_in_token || '')}
                                className="mt-1 text-xs text-app-accent hover:text-app-accent-text"
                              >
                                Copy Token
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-app-text-subtle">N/A</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <span className="rounded-full bg-app-accent-soft px-2 py-1 text-xs font-semibold text-app-accent-text uppercase">
                          {formatRegistrationStatus(registration.registration_status)}
                        </span>
                        {registration.registration_status === 'confirmed' && (
                          <p className="mt-2 text-xs text-app-text-muted">Counts toward attendance totals.</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        {registration.checked_in ? (
                          <div>
                            <span className="font-semibold text-app-accent">✓ Yes</span>
                            {registration.check_in_time && (
                              <div className="text-xs text-app-text-muted">
                                {new Date(registration.check_in_time).toLocaleString()}
                              </div>
                            )}
                            {registration.check_in_method && (
                              <div className="text-xs text-app-text-subtle">
                                Method: {registration.check_in_method}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-app-text-subtle">No</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-app-text-muted">
                        {new Date(registration.created_at).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={() => onOpenManageRegistration(registration)}
                            disabled={actionLoading}
                            className="text-app-accent hover:text-app-accent-text disabled:opacity-60"
                          >
                            Manage
                          </button>
                          {canCheckIn && (
                            <button
                              type="button"
                              onClick={() => void onCheckIn(registration.registration_id)}
                              disabled={actionLoading}
                              className="text-app-accent hover:text-app-accent-text disabled:opacity-60"
                            >
                              Check In
                            </button>
                          )}
                          {!canCheckIn && !registration.checked_in && (
                            <span className="text-xs text-app-text-muted">
                              {checkInUnavailableReason || 'Check-in unavailable'}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => void onCancelRegistration(registration.registration_id)}
                            disabled={actionLoading}
                            className="text-app-accent hover:text-app-accent-text disabled:opacity-60"
                          >
                            Remove
                          </button>
                          {onSendConfirmationEmail &&
                            confirmationEmailEligibleStatuses.has(registration.registration_status) && (
                              <button
                                type="button"
                                onClick={() => void handleSendConfirmationEmail(registration.registration_id)}
                                disabled={actionLoading || confirmationEmailLoadingId === registration.registration_id}
                                className="text-app-accent hover:text-app-accent-text disabled:opacity-60"
                              >
                                {confirmationEmailLoadingId === registration.registration_id
                                  ? 'Sending email...'
                                  : registration.confirmation_email_sent_at
                                    ? 'Resend QR Email'
                                    : 'Send QR Email'}
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                    {isManaging && manageDraft && (
                      <tr key={`${registration.registration_id}-manage`}>
                        <td colSpan={6} className="px-6 py-4 bg-app-surface-muted">
                          <div className="mb-4 flex flex-wrap gap-2 text-xs text-app-text-muted">
                            <span className="rounded bg-app-surface px-2 py-1">
                              Current status: {formatRegistrationStatus(registration.registration_status)}
                            </span>
                            <span className="rounded bg-app-surface px-2 py-1">
                              Check-in: {registration.checked_in ? 'Complete' : 'Pending'}
                            </span>
                            {linkedCase && (
                              <span className="rounded bg-app-surface px-2 py-1">
                                Linked case: {linkedCase.case_number}
                              </span>
                            )}
                          </div>

                          <div className="grid gap-4 md:grid-cols-3">
                            <div>
                              <label
                                htmlFor={`registration-status-${registration.registration_id}`}
                                className="mb-1 block text-xs font-black uppercase text-app-text-muted"
                              >
                                Status
                              </label>
                              <select
                                id={`registration-status-${registration.registration_id}`}
                                value={manageDraft.registration_status}
                                onChange={(event) =>
                                  setManageDraft((current) =>
                                    current
                                      ? {
                                          ...current,
                                          registration_status: event.target.value as RegistrationStatus,
                                        }
                                      : current
                                  )
                                }
                                className="w-full rounded-md border px-3 py-2"
                              >
                                <option value="registered">Registered</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="waitlisted">Waitlisted</option>
                                <option value="no_show">No Show</option>
                              </select>
                            </div>

                            <div>
                              <label
                                htmlFor={`registration-case-${registration.registration_id}`}
                                className="mb-1 block text-xs font-black uppercase text-app-text-muted"
                              >
                                Linked Case
                              </label>
                              <select
                                id={`registration-case-${registration.registration_id}`}
                                value={manageDraft.case_id}
                                onChange={(event) =>
                                  setManageDraft((current) =>
                                    current ? { ...current, case_id: event.target.value } : current
                                  )
                                }
                                className="w-full rounded-md border px-3 py-2"
                                disabled={manageLoading}
                              >
                                <option value="">No linked case</option>
                                {caseOptions.map((caseOption) => (
                                  <option key={caseOption.id} value={caseOption.id}>
                                    {caseOption.case_number} - {caseOption.title}
                                  </option>
                                ))}
                              </select>
                              {manageLoading && (
                                <p className="mt-1 text-xs text-app-text-muted">Loading cases...</p>
                              )}
                            </div>

                            <div>
                              <label
                                htmlFor={`registration-notes-${registration.registration_id}`}
                                className="mb-1 block text-xs font-black uppercase text-app-text-muted"
                              >
                                Internal Notes
                              </label>
                              <textarea
                                id={`registration-notes-${registration.registration_id}`}
                                value={manageDraft.notes}
                                onChange={(event) =>
                                  setManageDraft((current) =>
                                    current ? { ...current, notes: event.target.value } : current
                                  )
                                }
                                rows={3}
                                className="w-full rounded-md border px-3 py-2"
                                placeholder="Registration notes for staff..."
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Link
                              to={`/contacts/${registration.contact_id}`}
                              className="rounded border border-app-border bg-app-surface px-3 py-2 text-xs font-black uppercase text-app-text hover:bg-app-hover"
                            >
                              Open Contact
                            </Link>
                            {manageDraft.case_id && (
                              <Link
                                to={`/cases/${manageDraft.case_id}`}
                                className="rounded border border-app-border bg-app-surface px-3 py-2 text-xs font-black uppercase text-app-text hover:bg-app-hover"
                              >
                                Open Linked Case
                              </Link>
                            )}
                          </div>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={submitManageRegistration}
                              disabled={actionLoading}
                              className="rounded-md bg-app-accent px-4 py-2 text-[var(--app-accent-foreground)] hover:bg-app-accent-hover disabled:opacity-60"
                            >
                              Save Changes
                            </button>
                            <button
                              type="button"
                              onClick={closeManageRegistration}
                              disabled={actionLoading}
                              className="rounded-md border px-4 py-2 hover:bg-app-surface disabled:opacity-60"
                            >
                              Close
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
