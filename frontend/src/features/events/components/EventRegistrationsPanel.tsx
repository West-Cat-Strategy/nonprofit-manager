import { useCallback, useEffect, useMemo, useState } from 'react';
import { casesApiClient } from '../../cases/api/casesApiClient';
import { EventRegistrationKioskCard } from './EventRegistrationKioskCard';
import { EventRegistrationOccurrenceContextCard } from './EventRegistrationOccurrenceContextCard';
import { EventRegistrationRemindersSection } from './EventRegistrationRemindersSection';
import { EventRegistrationTable } from './EventRegistrationTable';
import type {
  EventRegistrationsPanelProps,
  RegistrationCaseOption,
  RegistrationManageDraft,
} from './eventRegistrationsPanelShared';

export default function EventRegistrationsPanel({
  eventId,
  eventStartDate,
  selectedOccurrence,
  occurrenceOptions = [],
  batchScope = 'occurrence',
  organizationTimezone,
  registrations,
  checkInSettings,
  checkInSettingsLoading,
  actionLoading,
  remindersSending,
  remindersError,
  reminderSummary,
  reminderAutomations,
  automationsLoading,
  automationsBusy,
  onCheckIn,
  onUpdateRegistration,
  onCancelRegistration,
  onSendReminders,
  onUpdateCheckInSettings,
  onRotateCheckInPin,
  onScanCheckIn,
  onSendConfirmationEmail,
  onCancelAutomation,
  onCreateAutomation,
  onChangeBatchScope,
  onSelectOccurrence,
}: EventRegistrationsPanelProps) {
  const [registrationFilter, setRegistrationFilter] = useState('');
  const [registrationSearch, setRegistrationSearch] = useState('');
  const [qrCodesByRegistration, setQrCodesByRegistration] = useState<Record<string, string>>({});
  const [scanToken, setScanToken] = useState('');
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [kioskEnabledDraft, setKioskEnabledDraft] = useState(false);
  const [kioskBusy, setKioskBusy] = useState(false);
  const [kioskMessage, setKioskMessage] = useState<string | null>(null);
  const [kioskError, setKioskError] = useState<string | null>(null);
  const [latestPin, setLatestPin] = useState<string | null>(null);
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const [manageDraft, setManageDraft] = useState<RegistrationManageDraft | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [caseOptionsByContact, setCaseOptionsByContact] = useState<
    Record<string, RegistrationCaseOption[]>
  >({});
  const [caseOptionsLoadingContactId, setCaseOptionsLoadingContactId] = useState<string | null>(null);
  const [confirmationEmailLoadingId, setConfirmationEmailLoadingId] = useState<string | null>(null);

  const activeOccurrence = selectedOccurrence ?? occurrenceOptions[0] ?? null;

  const scopedRegistrations = useMemo(() => {
    if (!activeOccurrence) {
      return registrations;
    }

    return registrations.filter(
      (registration) =>
        !registration.occurrence_id || registration.occurrence_id === activeOccurrence.occurrence_id
    );
  }, [activeOccurrence, registrations]);

  const scopedAutomations = useMemo(() => {
    if (!activeOccurrence) {
      return reminderAutomations;
    }

    return reminderAutomations.filter(
      (automation) =>
        !automation.occurrence_id || automation.occurrence_id === activeOccurrence.occurrence_id
    );
  }, [activeOccurrence, reminderAutomations]);

  const filteredRegistrations = useMemo(() => {
    const needle = registrationSearch.trim().toLowerCase();

    return scopedRegistrations.filter((registration) => {
      const matchesStatus = registrationFilter
        ? registration.registration_status === registrationFilter
        : true;

      if (!matchesStatus) return false;
      if (!needle) return true;

      const haystack = [
        registration.contact_name,
        registration.contact_email,
        registration.registration_status,
        registration.check_in_token,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [registrationFilter, registrationSearch, scopedRegistrations]);

  useEffect(() => {
    let cancelled = false;

    const generateCodes = async () => {
      try {
        const registrationsWithTokens = filteredRegistrations.filter(
          (registration) => registration.check_in_token
        );
        if (registrationsWithTokens.length === 0) {
          if (!cancelled) {
            setQrCodesByRegistration({});
          }
          return;
        }

        const { toDataURL } = await import('qrcode');
        const entries = await Promise.all(
          filteredRegistrations.map(async (registration) => {
            if (!registration.check_in_token) {
              return [registration.registration_id, ''] as const;
            }

            try {
              const dataUrl = await toDataURL(registration.check_in_token, {
                width: 96,
                margin: 1,
              });
              return [registration.registration_id, dataUrl] as const;
            } catch {
              return [registration.registration_id, ''] as const;
            }
          })
        );

        if (cancelled) return;
        setQrCodesByRegistration(
          entries.reduce<Record<string, string>>((accumulator, [registrationId, dataUrl]) => {
            if (dataUrl) {
              accumulator[registrationId] = dataUrl;
            }
            return accumulator;
          }, {})
        );
      } catch {
        if (!cancelled) {
          setQrCodesByRegistration({});
        }
      }
    };

    void generateCodes();

    return () => {
      cancelled = true;
    };
  }, [filteredRegistrations]);

  useEffect(() => {
    if (checkInSettings) {
      setKioskEnabledDraft(checkInSettings.public_checkin_enabled);
    }
  }, [checkInSettings]);

  const kioskUrl =
    typeof window === 'undefined'
      ? activeOccurrence?.occurrence_id
        ? `/event-check-in/${eventId}?occurrence_id=${activeOccurrence.occurrence_id}`
        : `/event-check-in/${eventId}`
      : activeOccurrence?.occurrence_id
        ? `${window.location.origin}/event-check-in/${eventId}?occurrence_id=${activeOccurrence.occurrence_id}`
        : `${window.location.origin}/event-check-in/${eventId}`;

  const saveKioskSettings = async () => {
    setKioskBusy(true);
    setKioskError(null);
    setKioskMessage(null);
    try {
      await onUpdateCheckInSettings(kioskEnabledDraft);
      setKioskMessage(kioskEnabledDraft ? 'Public kiosk enabled.' : 'Public kiosk disabled.');
    } catch {
      setKioskError('Failed to update kiosk settings.');
    } finally {
      setKioskBusy(false);
    }
  };

  const rotateKioskPin = async () => {
    setKioskBusy(true);
    setKioskError(null);
    setKioskMessage(null);
    try {
      const pin = await onRotateCheckInPin();
      setLatestPin(pin);
      setKioskMessage('PIN rotated. Share this PIN with on-site staff only.');
    } catch {
      setKioskError('Failed to rotate kiosk PIN.');
    } finally {
      setKioskBusy(false);
    }
  };

  const submitScanCheckIn = useCallback(
    async (rawToken: string) => {
      if (!onScanCheckIn) return;

      const token = rawToken.trim();
      if (!token) return;

      setScanError(null);
      setScanStatusMessage(null);

      try {
        await onScanCheckIn(token);
        setScanStatusMessage(`Checked in token ${token.slice(0, 10)}${token.length > 10 ? '...' : ''}`);
      } catch {
        setScanError('Failed to check in scanned token.');
      }
    },
    [onScanCheckIn]
  );

  const handleCameraTokenScanned = useCallback(
    (token: string) => {
      setScanToken(token);
      void submitScanCheckIn(token).then(() => {
        setScanToken('');
      });
    },
    [submitScanCheckIn]
  );

  const loadCasesForRegistration = useCallback(async (registration: EventRegistration) => {
    if (caseOptionsByContact[registration.contact_id]) {
      return;
    }

    setCaseOptionsLoadingContactId(registration.contact_id);
    try {
      const response = await casesApiClient.listCases({
        contactId: registration.contact_id,
        limit: 100,
      });
      setCaseOptionsByContact((current) => ({
        ...current,
        [registration.contact_id]: (response.cases || []).map((caseItem) => ({
          id: caseItem.id,
          case_number: caseItem.case_number,
          title: caseItem.title,
        })),
      }));
    } finally {
      setCaseOptionsLoadingContactId((current) =>
        current === registration.contact_id ? null : current
      );
    }
  }, [caseOptionsByContact]);

  const openManageRegistration = useCallback(
    async (registration: EventRegistration) => {
      setEditingRegistrationId(registration.registration_id);
      setManageDraft({
        registration_status: registration.registration_status,
        notes: registration.notes || '',
        case_id: registration.case_id || '',
      });
      setManageError(null);
      setManageMessage(null);
      await loadCasesForRegistration(registration);
    },
    [loadCasesForRegistration]
  );

  const handleSendConfirmationEmail = useCallback(
    async (registrationId: string) => {
      if (!onSendConfirmationEmail) {
        return;
      }

      setConfirmationEmailLoadingId(registrationId);
      setManageError(null);
      try {
        await onSendConfirmationEmail(registrationId);
        setManageMessage('Confirmation email sent.');
      } catch (error) {
        setManageError(error instanceof Error ? error.message : 'Failed to send confirmation email.');
      } finally {
        setConfirmationEmailLoadingId((current) => (current === registrationId ? null : current));
      }
    },
    [onSendConfirmationEmail]
  );

  const closeManageRegistration = useCallback(() => {
    setEditingRegistrationId(null);
    setManageDraft(null);
    setManageError(null);
    setManageMessage(null);
  }, []);

  const submitManageRegistration = useCallback(async () => {
    if (!editingRegistrationId || !manageDraft) {
      return;
    }

    setManageError(null);
    setManageMessage(null);

    try {
      await onUpdateRegistration(editingRegistrationId, {
        registration_status: manageDraft.registration_status,
        notes: manageDraft.notes.trim() || undefined,
        case_id: manageDraft.case_id || null,
        occurrence_id: activeOccurrence?.occurrence_id ?? undefined,
        scope: batchScope,
      });
      setManageMessage('Registration updated.');
    } catch (error) {
      setManageError(error instanceof Error ? error.message : 'Failed to update registration.');
    }
  }, [activeOccurrence?.occurrence_id, batchScope, editingRegistrationId, manageDraft, onUpdateRegistration]);

  return (
    <div className="rounded-lg bg-app-surface p-6 shadow-md">
      {remindersError && (
        <div className="mb-4 rounded-md bg-app-accent-soft p-3 text-sm text-app-accent-text">
          {remindersError}
        </div>
      )}

      <EventRegistrationOccurrenceContextCard
        activeOccurrence={activeOccurrence}
        batchScope={batchScope}
        occurrenceOptions={occurrenceOptions}
        onChangeBatchScope={onChangeBatchScope}
        onSelectOccurrence={onSelectOccurrence}
      />

      <EventRegistrationKioskCard
        checkInSettings={checkInSettings}
        checkInSettingsLoading={checkInSettingsLoading}
        kioskBusy={kioskBusy}
        kioskEnabledDraft={kioskEnabledDraft}
        kioskError={kioskError}
        kioskMessage={kioskMessage}
        kioskUrl={kioskUrl}
        latestPin={latestPin}
        onRotateKioskPin={() => void rotateKioskPin()}
        onSaveKioskSettings={() => void saveKioskSettings()}
        setKioskEnabledDraft={setKioskEnabledDraft}
      />

      <EventRegistrationRemindersSection
        activeOccurrence={activeOccurrence}
        automationsBusy={automationsBusy}
        automationsLoading={automationsLoading}
        eventStartDate={eventStartDate}
        organizationTimezone={organizationTimezone}
        reminderSummary={reminderSummary}
        remindersSending={remindersSending}
        scopedAutomations={scopedAutomations}
        onCancelAutomation={onCancelAutomation}
        onCreateAutomation={onCreateAutomation}
        onSendReminders={onSendReminders}
      />

      <EventRegistrationTable
        actionLoading={actionLoading}
        cameraScannerOpen={cameraScannerOpen}
        caseOptionsByContact={caseOptionsByContact}
        caseOptionsLoadingContactId={caseOptionsLoadingContactId}
        closeManageRegistration={closeManageRegistration}
        confirmationEmailLoadingId={confirmationEmailLoadingId}
        editingRegistrationId={editingRegistrationId}
        filteredRegistrations={filteredRegistrations}
        handleCameraTokenScanned={handleCameraTokenScanned}
        handleSendConfirmationEmail={(registrationId) => void handleSendConfirmationEmail(registrationId)}
        manageDraft={manageDraft}
        manageError={manageError}
        manageMessage={manageMessage}
        onCancelRegistration={onCancelRegistration}
        onCheckIn={onCheckIn}
        onOpenManageRegistration={(registration) => void openManageRegistration(registration)}
        onScanCheckIn={onScanCheckIn}
        onSendConfirmationEmail={onSendConfirmationEmail}
        registrationFilter={registrationFilter}
        registrationSearch={registrationSearch}
        qrCodesByRegistration={qrCodesByRegistration}
        scanError={scanError}
        scanStatusMessage={scanStatusMessage}
        scanToken={scanToken}
        setCameraScannerOpen={setCameraScannerOpen}
        setManageDraft={setManageDraft}
        setRegistrationFilter={setRegistrationFilter}
        setRegistrationSearch={setRegistrationSearch}
        setScanToken={setScanToken}
        submitManageRegistration={() => void submitManageRegistration()}
        submitScanCheckIn={submitScanCheckIn}
      />
    </div>
  );
}
