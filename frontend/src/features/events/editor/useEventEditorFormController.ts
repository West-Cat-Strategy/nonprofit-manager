import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { differenceInMinutes } from 'date-fns';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUnsavedChangesGuard } from '../../../hooks/useUnsavedChangesGuard';
import { getUserTimezoneCached } from '../../../services/userPreferencesService';
import type { CreateEventDTO, Event, UpdateEventDTO } from '../../../types/event';
import { eventsApiClient } from '../api/eventsApiClient';
import { resolveEventReturnTarget } from '../navigation/eventRouteTargets';
import { getBrowserTimeZone } from '../utils/reminderTime';
import {
  buildEventSubmitPayload,
  buildReminderSyncPayload,
  createDefaultReminderRow,
  createEmptyFormData,
  deriveAutoManagedEndDate,
  mapAutomationToReminderRow,
  mapEventToFormData,
  type EventEditorFormData,
  type ReminderRowFormState,
} from './model';

export interface UseEventEditorFormControllerArgs {
  event?: Event | null;
  onSubmit: (eventData: CreateEventDTO | UpdateEventDTO) => Promise<Event | void>;
  isEdit?: boolean;
}

export interface UseEventEditorFormControllerResult {
  loading: boolean;
  error: string | null;
  isDirty: boolean;
  isEndDateAutoManaged: boolean;
  organizationTimezone: string;
  formData: EventEditorFormData;
  automationRows: ReminderRowFormState[];
  automationRowsLoading: boolean;
  reminderSyncError: string | null;
  savedEventIdForRetry: string | null;
  retryingReminderSync: boolean;
  durationMinutes: number | null;
  timeValidationMessage: string | null;
  scheduleHelperText: string;
  handleInputChange: (
    eventChange: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  updateReminderRow: (rowId: string, updates: Partial<ReminderRowFormState>) => void;
  addReminderRow: () => void;
  removeReminderRow: (rowId: string) => void;
  handleCancel: () => void;
  handleSubmit: (submitEvent: FormEvent) => Promise<void>;
  handleRetryReminderSync: () => Promise<void>;
}

export function useEventEditorFormController({
  event,
  onSubmit,
  isEdit = false,
}: UseEventEditorFormControllerArgs): UseEventEditorFormControllerResult {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isEndDateAutoManaged, setIsEndDateAutoManaged] = useState(!isEdit);
  const [organizationTimezone, setOrganizationTimezone] = useState(getBrowserTimeZone());
  const [automationRows, setAutomationRows] = useState<ReminderRowFormState[]>([]);
  const [automationRowsLoading, setAutomationRowsLoading] = useState(false);
  const [reminderSyncError, setReminderSyncError] = useState<string | null>(null);
  const [savedEventIdForRetry, setSavedEventIdForRetry] = useState<string | null>(null);
  const [retryingReminderSync, setRetryingReminderSync] = useState(false);
  const [formData, setFormData] = useState<EventEditorFormData>(() =>
    event ? mapEventToFormData(event) : createEmptyFormData()
  );
  const returnTarget = resolveEventReturnTarget(searchParams.get('return_to'), '/events');

  useEffect(() => {
    let isMounted = true;

    const loadTimezone = async () => {
      const fallbackTimezone = getBrowserTimeZone();
      const timezone = await getUserTimezoneCached(fallbackTimezone);
      if (isMounted) {
        setOrganizationTimezone(timezone);
      }
    };

    void loadTimezone();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (event) {
      setFormData(mapEventToFormData(event));
      setIsEndDateAutoManaged(!event.end_date);
    } else if (!isEdit) {
      setFormData(createEmptyFormData());
      setIsEndDateAutoManaged(true);
    }

    setIsDirty(false);
    setReminderSyncError(null);
    setSavedEventIdForRetry(null);
  }, [event, isEdit]);

  useEffect(() => {
    if (!event?.event_id) {
      setAutomationRows([]);
      return;
    }

    let isMounted = true;

    const loadReminderAutomations = async () => {
      setAutomationRowsLoading(true);
      try {
        const automations = await eventsApiClient.listReminderAutomations(event.event_id);
        if (!isMounted) {
          return;
        }

        const pendingRows = automations
          .filter((item) => item.is_active && !item.attempted_at)
          .map((item) => mapAutomationToReminderRow(item, organizationTimezone));

        setAutomationRows(pendingRows);
      } catch {
        if (isMounted) {
          setAutomationRows([]);
        }
      } finally {
        if (isMounted) {
          setAutomationRowsLoading(false);
        }
      }
    };

    void loadReminderAutomations();

    return () => {
      isMounted = false;
    };
  }, [event?.event_id, organizationTimezone]);

  useUnsavedChangesGuard({
    hasUnsavedChanges: isDirty && !loading && !retryingReminderSync,
  });

  const parsedStartDate = useMemo(
    () => (formData.start_date ? new Date(formData.start_date) : null),
    [formData.start_date]
  );
  const parsedEndDate = useMemo(
    () => (formData.end_date ? new Date(formData.end_date) : null),
    [formData.end_date]
  );
  const durationMinutes = useMemo(() => {
    if (!parsedStartDate || !parsedEndDate) {
      return null;
    }

    return differenceInMinutes(parsedEndDate, parsedStartDate);
  }, [parsedEndDate, parsedStartDate]);

  const timeValidationMessage =
    durationMinutes !== null && durationMinutes <= 0
      ? 'End time must be after the start time.'
      : null;

  const scheduleHelperText = !formData.start_date
    ? 'Choose a start date and time to begin the event schedule.'
    : isEndDateAutoManaged
      ? 'End time is auto-set to 2 hours after the start time until you edit it.'
      : 'End time is fixed. Clear the field to restore the 2-hour default.';

  const handleInputChange = (
    eventChange: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const target = eventChange.target;
    const { name, value } = target;
    setIsDirty(true);

    if (target instanceof HTMLInputElement && target.type === 'checkbox') {
      const checked = target.checked;
      setFormData((prev) => ({
        ...prev,
        [name]: checked,
        ...(name === 'is_recurring' && !checked
          ? {
              recurrence_pattern: 'weekly' as const,
              recurrence_interval: 1,
              recurrence_end_date: '',
            }
          : {}),
      }));
      return;
    }

    if (name === 'capacity' || name === 'recurrence_interval') {
      const parsed = value === '' ? undefined : Number.parseInt(value, 10);
      setFormData((prev) => ({
        ...prev,
        [name]: Number.isNaN(parsed) ? undefined : parsed,
      }));
      return;
    }

    if (name === 'start_date') {
      setFormData((prev) => ({
        ...prev,
        start_date: value,
        end_date: isEndDateAutoManaged ? deriveAutoManagedEndDate(value) : prev.end_date,
      }));
      return;
    }

    if (name === 'end_date') {
      if (!value) {
        setIsEndDateAutoManaged(true);
        setFormData((prev) => ({
          ...prev,
          end_date: prev.start_date ? deriveAutoManagedEndDate(prev.start_date) : '',
        }));
        return;
      }

      setIsEndDateAutoManaged(false);
      setFormData((prev) => ({
        ...prev,
        end_date: value,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const updateReminderRow = (rowId: string, updates: Partial<ReminderRowFormState>): void => {
    setIsDirty(true);
    setAutomationRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row))
    );
  };

  const addReminderRow = (): void => {
    setIsDirty(true);
    setAutomationRows((prev) => [...prev, createDefaultReminderRow(organizationTimezone)]);
  };

  const removeReminderRow = (rowId: string): void => {
    setIsDirty(true);
    setAutomationRows((prev) => prev.filter((row) => row.id !== rowId));
  };

  const handleCancel = (): void => {
    navigate(returnTarget);
  };

  const syncReminderAutomations = async (eventId: string): Promise<void> => {
    const payload = buildReminderSyncPayload(automationRows);
    await eventsApiClient.syncReminderAutomations(eventId, payload);
  };

  const handleRetryReminderSync = async () => {
    if (!savedEventIdForRetry) {
      return;
    }

    setRetryingReminderSync(true);
    setReminderSyncError(null);

    try {
      await syncReminderAutomations(savedEventIdForRetry);
      setSavedEventIdForRetry(null);
      setIsDirty(false);
      navigate(returnTarget);
    } catch (requestError: unknown) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : 'Failed to synchronize automated reminders';
      setReminderSyncError(`Event is saved, but reminder sync failed again: ${message}`);
    } finally {
      setRetryingReminderSync(false);
    }
  };

  const handleSubmit = async (submitEvent: FormEvent) => {
    submitEvent.preventDefault();
    setError(null);
    setReminderSyncError(null);
    setLoading(true);

    try {
      if (timeValidationMessage) {
        throw new Error(timeValidationMessage);
      }

      const normalizedData = buildEventSubmitPayload(formData);
      const savedEvent = await onSubmit(normalizedData);
      const eventId = savedEvent?.event_id || event?.event_id || null;

      if (!eventId && automationRows.length > 0) {
        throw new Error('Event was saved, but reminder sync could not run due to missing event id');
      }

      if (eventId) {
        try {
          await syncReminderAutomations(eventId);
          setSavedEventIdForRetry(null);
          setIsDirty(false);
          navigate(returnTarget);
          return;
        } catch (requestError: unknown) {
          const message =
            requestError instanceof Error
              ? requestError.message
              : 'Failed to synchronize automated reminders';
          setSavedEventIdForRetry(eventId);
          setReminderSyncError(
            `Event details were saved, but automated reminders could not be synchronized: ${message}`
          );
          setIsDirty(true);
          return;
        }
      }

      setIsDirty(false);
      navigate(returnTarget);
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : null;
      setError(message || 'Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    isDirty,
    isEndDateAutoManaged,
    organizationTimezone,
    formData,
    automationRows,
    automationRowsLoading,
    reminderSyncError,
    savedEventIdForRetry,
    retryingReminderSync,
    durationMinutes,
    timeValidationMessage,
    scheduleHelperText,
    handleInputChange,
    updateReminderRow,
    addReminderRow,
    removeReminderRow,
    handleCancel,
    handleSubmit,
    handleRetryReminderSync,
  };
}
