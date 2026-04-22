import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { format, parseISO } from 'date-fns';
import { useToast } from '../../../../contexts/useToast';
import useConfirmDialog from '../../../../hooks/useConfirmDialog';
import { usePersistentPortalCaseContext } from '../../../../hooks/usePersistentPortalCaseContext';
import portalApi from '../../../../services/portalApi';
import { unwrapApiData } from '../../../../services/apiEnvelope';
import { formatApiErrorMessage } from '../../../../utils/apiError';
import { portalV2ApiClient } from '../../api/portalApiClient';
import type { PortalPointpersonContext } from '../../types/contracts';
import {
  buildDefaultLocalValue,
  type CalendarFilter,
  type PortalCalendarEntryMeta,
  normalizeAppointmentEntry,
  normalizeEventEntry,
  normalizeSlotEntry,
  toDateKey,
  toIsoFromLocal,
  type BookingCalendarEntry,
} from './adapters';

export function usePortalCalendarController() {
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();
  const { selectedCaseId, setSelectedCaseId, clearSelectedCaseId } =
    usePersistentPortalCaseContext();

  const [context, setContext] = useState<PortalPointpersonContext | null>(null);
  const [calendarEntries, setCalendarEntries] = useState<
    BookingCalendarEntry<PortalCalendarEntryMeta>[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibleRange, setVisibleRange] = useState<{ startDate: string; endDate: string } | null>(
    null
  );
  const [filter, setFilter] = useState<CalendarFilter>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
  });
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  const loadContext = useCallback(async () => {
    const response = await portalApi.get('/v2/portal/pointperson/context');
    const payload = unwrapApiData<PortalPointpersonContext>(response.data);
    setContext(payload);

    const caseIds = new Set(payload.cases.map((entry) => entry.case_id));
    const nextCaseId =
      (selectedCaseId && caseIds.has(selectedCaseId) ? selectedCaseId : null) ||
      (payload.selected_case_id && caseIds.has(payload.selected_case_id)
        ? payload.selected_case_id
        : null) ||
      (payload.default_case_id && caseIds.has(payload.default_case_id)
        ? payload.default_case_id
        : null) ||
      payload.cases[0]?.case_id ||
      '';

    if (nextCaseId) {
      setSelectedCaseId(nextCaseId);
    } else {
      clearSelectedCaseId();
    }
  }, [clearSelectedCaseId, selectedCaseId, setSelectedCaseId]);

  const loadCalendar = useCallback(
    async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
      setCalendarLoading(true);
      try {
        const [events, appointments, slotsPayload] = await Promise.all([
          portalV2ApiClient.listEventsAll({
            from: startDate,
            to: endDate,
            sort: 'start_date',
            order: 'asc',
          }),
          portalV2ApiClient.listAppointmentsAll({
            case_id: selectedCaseId || undefined,
            from: startDate,
            to: endDate,
          }),
          portalV2ApiClient.listAppointmentSlots({
            case_id: selectedCaseId || undefined,
            from: startDate,
            to: endDate,
          }),
        ]);

        const nextEntries = [
          ...events.map(normalizeEventEntry),
          ...appointments.map(normalizeAppointmentEntry),
          ...slotsPayload.slots.map(normalizeSlotEntry),
        ].sort((left, right) => new Date(left.start).getTime() - new Date(right.start).getTime());

        setCalendarEntries(nextEntries);
        setError(null);
        setSelectedEntryId((current) =>
          current && nextEntries.some((entry) => entry.id === current) ? current : null
        );
      } catch (loadError) {
        console.error('Failed to load portal calendar', loadError);
        setError('Unable to load your calendar right now.');
      } finally {
        setCalendarLoading(false);
      }
    },
    [selectedCaseId]
  );

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadContext();
      } catch (loadError) {
        if (!cancelled) {
          console.error('Failed to load portal calendar context', loadError);
          setError('Unable to load your booking context right now.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void initialize();
    return () => {
      cancelled = true;
    };
  }, [loadContext]);

  useEffect(() => {
    if (!selectedDate || requestForm.start_time) {
      return;
    }

    setRequestForm((current) => ({
      ...current,
      start_time: buildDefaultLocalValue(selectedDate, 9),
      end_time: buildDefaultLocalValue(selectedDate, 10),
    }));
  }, [requestForm.start_time, selectedDate]);

  useEffect(() => {
    if (!visibleRange || loading) {
      return;
    }

    void loadCalendar(visibleRange);
  }, [loadCalendar, loading, visibleRange]);

  const filteredEntries = useMemo(() => {
    if (filter === 'all') {
      return calendarEntries;
    }

    const wantedKind =
      filter === 'events' ? 'event' : filter === 'appointments' ? 'appointment' : 'slot';
    return calendarEntries.filter((entry) => entry.kind === wantedKind);
  }, [calendarEntries, filter]);

  const selectedDateEntries = useMemo(() => {
    if (!selectedDate) {
      return [];
    }

    const selectedKey = format(selectedDate, 'yyyy-MM-dd');
    return filteredEntries.filter((entry) => toDateKey(entry.start) === selectedKey);
  }, [filteredEntries, selectedDate]);

  const selectedEntry = useMemo(
    () => filteredEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [filteredEntries, selectedEntryId]
  );

  const handleSelectDate = useCallback((date: Date) => {
    setSelectedDate(date);
  }, []);

  const handleSelectEntry = useCallback((entry: BookingCalendarEntry<PortalCalendarEntryMeta>) => {
    setSelectedEntryId(entry.id);
    setSelectedDate(parseISO(entry.start));
  }, []);

  const handleMonthRangeChange = useCallback((range: { startDate: string; endDate: string }) => {
    setVisibleRange((current) => {
      if (current?.startDate === range.startDate && current?.endDate === range.endDate) {
        return current;
      }

      return range;
    });
  }, []);

  const handleRegisterEvent = async (eventId: string) => {
    setSavingEntryId(`event:${eventId}`);
    try {
      await portalV2ApiClient.registerEvent(eventId);
      showSuccess('Registered for event.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (registerError) {
      showError(formatApiErrorMessage(registerError, 'Could not register for this event.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleCancelEvent = async (eventId: string) => {
    const confirmed = await confirm({
      title: 'Cancel registration',
      message: 'Are you sure you want to cancel this event registration?',
      confirmLabel: 'Cancel registration',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }

    setSavingEntryId(`event:${eventId}`);
    try {
      await portalV2ApiClient.cancelEventRegistration(eventId);
      showSuccess('Registration canceled.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (cancelError) {
      showError(formatApiErrorMessage(cancelError, 'Could not cancel this registration.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    if (!selectedCaseId) {
      showError('Select a case before booking a slot.');
      return;
    }

    setSavingEntryId(`slot:${slotId}`);
    try {
      await portalV2ApiClient.bookAppointmentSlot(slotId, { case_id: selectedCaseId });
      showSuccess('Appointment booked.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (bookError) {
      showError(formatApiErrorMessage(bookError, 'Could not book this slot.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleCancelAppointment = async (appointmentId: string) => {
    const confirmed = await confirm({
      title: 'Cancel appointment',
      message: 'Are you sure you want to cancel this appointment?',
      confirmLabel: 'Cancel appointment',
      variant: 'warning',
    });
    if (!confirmed) {
      return;
    }

    setSavingEntryId(`appointment:${appointmentId}`);
    try {
      await portalV2ApiClient.cancelAppointment(appointmentId);
      showSuccess('Appointment canceled.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (cancelError) {
      showError(formatApiErrorMessage(cancelError, 'Could not cancel this appointment.'));
    } finally {
      setSavingEntryId(null);
    }
  };

  const handleRequestSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const startIso = toIsoFromLocal(requestForm.start_time);
    const endIso = toIsoFromLocal(requestForm.end_time);

    if (!startIso) {
      showError('Please choose a valid appointment start time.');
      return;
    }

    if (endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      showError('Appointment end time must be after the start time.');
      return;
    }

    setSubmittingRequest(true);
    try {
      await portalV2ApiClient.requestAppointment({
        case_id: selectedCaseId || undefined,
        title: requestForm.title,
        description: requestForm.description || undefined,
        start_time: startIso,
        end_time: endIso || undefined,
        location: requestForm.location || undefined,
      });
      setRequestForm({
        title: '',
        description: '',
        start_time: selectedDate ? buildDefaultLocalValue(selectedDate, 9) : '',
        end_time: selectedDate ? buildDefaultLocalValue(selectedDate, 10) : '',
        location: '',
      });
      showSuccess('Appointment request submitted.');
      if (visibleRange) {
        await loadCalendar(visibleRange);
      }
    } catch (requestError) {
      showError(formatApiErrorMessage(requestError, 'Could not submit this appointment request.'));
    } finally {
      setSubmittingRequest(false);
    }
  };

  const selectedEvent =
    selectedEntry?.metadata.kind === 'event' ? selectedEntry.metadata.event : null;
  const selectedAppointment =
    selectedEntry?.metadata.kind === 'appointment' ? selectedEntry.metadata.appointment : null;
  const selectedSlot = selectedEntry?.metadata.kind === 'slot' ? selectedEntry.metadata.slot : null;

  return {
    context,
    dialogState,
    handleCancel,
    handleConfirm,
    selectedCaseId,
    setSelectedCaseId,
    loading,
    calendarLoading,
    error,
    loadContext,
    filter,
    setFilter,
    selectedDate,
    selectedEntryId,
    filteredEntries,
    selectedDateEntries,
    selectedEntry,
    selectedEvent,
    selectedAppointment,
    selectedSlot,
    requestForm,
    setRequestForm,
    submittingRequest,
    savingEntryId,
    handleSelectDate,
    handleSelectEntry,
    handleMonthRangeChange,
    handleRegisterEvent,
    handleCancelEvent,
    handleBookSlot,
    handleCancelAppointment,
    handleRequestSubmit,
  };
}

export type PortalCalendarController = ReturnType<typeof usePortalCalendarController>;
