import { useMemo, useState } from 'react';
import { EventRegistrationKioskCard } from './EventRegistrationKioskCard';
import { EventRegistrationOccurrenceContextCard } from './EventRegistrationOccurrenceContextCard';
import { EventRegistrationRemindersSection } from './EventRegistrationRemindersSection';
import { EventRegistrationTable } from './EventRegistrationTable';
import type { EventRegistrationsPanelProps } from './eventRegistrationsPanelShared';
import { useEventRegistrationKioskSettings } from '../registrations/useEventRegistrationKioskSettings';
import { useEventRegistrationManageFlow } from '../registrations/useEventRegistrationManageFlow';
import { useEventRegistrationQrCodes } from '../registrations/useEventRegistrationQrCodes';
import { useEventRegistrationScanner } from '../registrations/useEventRegistrationScanner';

export default function EventRegistrationsPanel({
  eventId,
  eventStartDate,
  selectedOccurrence,
  occurrenceOptions = [],
  batchScope = 'occurrence',
  supportsBatchScope = true,
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

  const qrCodesByRegistration = useEventRegistrationQrCodes(filteredRegistrations);
  const {
    cameraScannerOpen,
    handleCameraTokenScanned,
    scanError,
    scanStatusMessage,
    scanToken,
    setCameraScannerOpen,
    setScanToken,
    submitScanCheckIn,
  } = useEventRegistrationScanner({ onScanCheckIn });
  const {
    caseOptionsByContact,
    caseOptionsLoadingContactId,
    closeManageRegistration,
    confirmationEmailLoadingId,
    editingRegistrationId,
    handleSendConfirmationEmail,
    manageDraft,
    manageError,
    manageMessage,
    openManageRegistration,
    setManageDraft,
    submitManageRegistration,
  } = useEventRegistrationManageFlow({
    batchScope,
    onUpdateRegistration,
    onSendConfirmationEmail,
  });
  const {
    kioskBusy,
    kioskEnabledDraft,
    kioskError,
    kioskMessage,
    kioskUrl,
    latestPin,
    rotateKioskPin,
    saveKioskSettings,
    setKioskEnabledDraft,
  } = useEventRegistrationKioskSettings({
    eventId,
    occurrenceId: activeOccurrence?.occurrence_id ?? null,
    checkInSettings,
    onUpdateCheckInSettings,
    onRotateCheckInPin,
  });

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
        supportsBatchScope={supportsBatchScope}
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
