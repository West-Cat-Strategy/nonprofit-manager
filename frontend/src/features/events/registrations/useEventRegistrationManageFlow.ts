import { useCallback, useState } from 'react';
import { casesApiClient } from '../../cases/api/casesApiClient';
import type { EventRegistration, UpdateRegistrationDTO } from '../../../types/event';
import type {
  RegistrationCaseOption,
  RegistrationManageDraft,
} from '../components/eventRegistrationsPanelShared';

interface UseEventRegistrationManageFlowArgs {
  activeOccurrenceId?: string | null;
  batchScope: 'occurrence' | 'future_occurrences' | 'series';
  onUpdateRegistration: (registrationId: string, payload: UpdateRegistrationDTO) => Promise<void>;
  onSendConfirmationEmail?: (registrationId: string) => Promise<void>;
}

const toCaseOptions = (
  cases: Array<{ id: string; case_number: string; title: string }>
): RegistrationCaseOption[] =>
  cases.map((caseItem) => ({
    id: caseItem.id,
    case_number: caseItem.case_number,
    title: caseItem.title,
  }));

export function useEventRegistrationManageFlow({
  activeOccurrenceId,
  batchScope,
  onUpdateRegistration,
  onSendConfirmationEmail,
}: UseEventRegistrationManageFlowArgs) {
  const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
  const [manageDraft, setManageDraft] = useState<RegistrationManageDraft | null>(null);
  const [manageError, setManageError] = useState<string | null>(null);
  const [manageMessage, setManageMessage] = useState<string | null>(null);
  const [caseOptionsByContact, setCaseOptionsByContact] = useState<Record<string, RegistrationCaseOption[]>>({});
  const [caseOptionsLoadingContactId, setCaseOptionsLoadingContactId] = useState<string | null>(null);
  const [confirmationEmailLoadingId, setConfirmationEmailLoadingId] = useState<string | null>(null);

  const loadCasesForRegistration = useCallback(
    async (registration: EventRegistration) => {
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
          [registration.contact_id]: toCaseOptions(response.cases || []),
        }));
      } finally {
        setCaseOptionsLoadingContactId((current) =>
          current === registration.contact_id ? null : current
        );
      }
    },
    [caseOptionsByContact]
  );

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
        occurrence_id: activeOccurrenceId ?? undefined,
        scope: batchScope,
      });
      setManageMessage('Registration updated.');
    } catch (error) {
      setManageError(error instanceof Error ? error.message : 'Failed to update registration.');
    }
  }, [activeOccurrenceId, batchScope, editingRegistrationId, manageDraft, onUpdateRegistration]);

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

  return {
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
  };
}
