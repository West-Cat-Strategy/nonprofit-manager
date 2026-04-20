import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { startOfDay, startOfMonth } from 'date-fns';
import { portalAdminAppointmentsApiClient } from '../../adminOps/api/portalAdminAppointmentsApiClient';
import { canAccessAdminSettings } from '../../auth/state/adminAccess';
import { useToast } from '../../../contexts/useToast';
import useConfirmDialog from '../../../hooks/useConfirmDialog';
import { useAppSelector } from '../../../store/hooks';
import type { EventOccurrence } from '../../../types/event';
import { formatApiErrorMessage } from '../../../utils/apiError';
import { eventsApiClient } from '../api/eventsApiClient';
import {
  buildStaffCalendarEntries,
  getEventOccurrenceLabel,
  getSelectedDateEntries,
  type StaffCalendarEntry,
} from '../scheduling/staffCalendarEntries';
import {
  formatDateParam,
  formatMonthParam,
  getVisibleMonthDate,
  normalizeEventStatus,
  normalizeScope,
  parseDateParam,
  parseMonthParam,
  parseValidIsoDate,
  type CalendarScope,
} from '../scheduling/staffCalendarQuery';
import type {
  PortalAdminAppointmentInboxItem,
  PortalAppointmentSlot,
} from '../../adminOps/contracts';

const SEARCH_DEBOUNCE_MS = 250;

export interface StaffEventsWorkspaceController {
  dialogState: ReturnType<typeof useConfirmDialog>['dialogState'];
  handleCancel: ReturnType<typeof useConfirmDialog>['handleCancel'];
  handleConfirm: ReturnType<typeof useConfirmDialog>['handleConfirm'];
  isAdmin: boolean;
  visibleMonth: Date;
  selectedDate: Date;
  selectedDateEntries: StaffCalendarEntry[];
  entries: StaffCalendarEntry[];
  selectedEntryId: string | null;
  selectedEntry: StaffCalendarEntry | null;
  selectedOccurrence: EventOccurrence | null;
  selectedAppointment: PortalAdminAppointmentInboxItem | null;
  selectedSlot: PortalAppointmentSlot | null;
  selectedOccurrenceLabel: string | null;
  searchInput: string;
  selectedEventType: string;
  selectedStatus: ReturnType<typeof normalizeEventStatus>;
  selectedScope: CalendarScope;
  activeFilterCount: number;
  loading: boolean;
  calendarLoading: boolean;
  error: string | null;
  savingEntryId: string | null;
  canUseEventActions: boolean;
  setSearchInput: (value: string) => void;
  handleMonthRangeChange: (range: { startDate: string; endDate: string }) => void;
  handleVisibleMonthChange: (nextMonth: Date) => void;
  handleSelectDate: (date: Date) => void;
  handleSelectEntry: (entry: StaffCalendarEntry) => void;
  handleTypeChange: (value: string) => void;
  handleStatusChange: (value: string) => void;
  handleScopeChange: (value: CalendarScope) => void;
  clearFilters: () => void;
  handleConfirmAppointment: (appointmentId: string) => Promise<void>;
  handleCheckInAppointment: (appointment: PortalAdminAppointmentInboxItem) => Promise<void>;
  handleCancelAppointment: (appointment: PortalAdminAppointmentInboxItem) => Promise<void>;
  handleToggleSlotStatus: (slot: PortalAppointmentSlot) => Promise<void>;
  handleManageSlots: () => void;
  refreshVisibleRange: () => Promise<void>;
}

export default function useStaffEventsWorkspaceController(): StaffEventsWorkspaceController {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const { dialogState, confirm, handleCancel, handleConfirm } = useConfirmDialog();
  const user = useAppSelector((state) => state.auth.user);
  const isAdmin = canAccessAdminSettings(user);

  const visibleMonth = useMemo(
    () => parseMonthParam(searchParams.get('month')) ?? startOfMonth(new Date()),
    [searchParams]
  );
  const selectedDate = useMemo(
    () => parseDateParam(searchParams.get('date')) ?? startOfDay(new Date()),
    [searchParams]
  );
  const appliedSearch = searchParams.get('search') ?? '';
  const selectedEventType = searchParams.get('type') ?? '';
  const selectedStatus = normalizeEventStatus(searchParams.get('status'));
  const selectedScope = normalizeScope(searchParams.get('scope'), isAdmin);
  const requestedEntryId = searchParams.get('entry');

  const [searchInput, setSearchInput] = useState(appliedSearch);
  const [visibleRange, setVisibleRange] = useState<{ startDate: string; endDate: string } | null>(
    null
  );
  const [entries, setEntries] = useState<StaffCalendarEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);

  const writeSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(updates)) {
        const shouldDelete =
          value === null ||
          value === '' ||
          (key === 'scope' && value === 'events') ||
          (key === 'month' && value === formatMonthParam(startOfMonth(new Date())));

        if (shouldDelete) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    setSearchInput(appliedSearch);
  }, [appliedSearch]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === appliedSearch) {
      return;
    }

    const timer = window.setTimeout(() => {
      writeSearchParams({ search: trimmed || null });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [appliedSearch, searchInput, writeSearchParams]);

  const loadCalendar = useCallback(
    async ({
      range,
      scope,
      search,
      eventType,
      status,
    }: {
      range: { startDate: string; endDate: string };
      scope: CalendarScope;
      search: string;
      eventType: string;
      status: ReturnType<typeof normalizeEventStatus>;
    }) => {
      setCalendarLoading(true);

      try {
        const [occurrences, appointments, slots] = await Promise.all([
          scope === 'events' || scope === 'all'
            ? eventsApiClient.listEventOccurrences({
                startDate: range.startDate,
                endDate: range.endDate,
                search: search || undefined,
                eventType: eventType || undefined,
                status: status || undefined,
              })
            : Promise.resolve([]),
          isAdmin && (scope === 'all' || scope === 'appointments')
            ? portalAdminAppointmentsApiClient.listAppointmentsAll({
                date_from: range.startDate,
                date_to: range.endDate,
              })
            : Promise.resolve([]),
          isAdmin && (scope === 'all' || scope === 'slots')
            ? portalAdminAppointmentsApiClient.listAppointmentSlotsAll({
                from: range.startDate,
                to: range.endDate,
              })
            : Promise.resolve([]),
        ]);

        const safeOccurrences = Array.isArray(occurrences) ? occurrences : [];
        const safeAppointments = Array.isArray(appointments) ? appointments : [];
        const safeSlots = Array.isArray(slots) ? slots : [];

        setEntries(buildStaffCalendarEntries(safeOccurrences, safeAppointments, safeSlots));
        setError(null);
      } catch (loadError) {
        console.error('Failed to load staff events workspace', loadError);
        setError('Unable to load the events calendar right now.');
      } finally {
        setCalendarLoading(false);
        setLoading(false);
      }
    },
    [isAdmin]
  );

  useEffect(() => {
    if (!visibleRange) {
      return;
    }

    void loadCalendar({
      range: visibleRange,
      scope: selectedScope,
      search: appliedSearch,
      eventType: selectedEventType,
      status: selectedStatus,
    });
  }, [appliedSearch, loadCalendar, selectedEventType, selectedScope, selectedStatus, visibleRange]);

  const selectedDateEntries = useMemo(
    () => getSelectedDateEntries(entries, selectedDate),
    [entries, selectedDate]
  );

  useEffect(() => {
    setSelectedEntryId((current) =>
      requestedEntryId && selectedDateEntries.some((entry) => entry.id === requestedEntryId)
        ? requestedEntryId
        : current && selectedDateEntries.some((entry) => entry.id === current)
          ? current
          : (selectedDateEntries[0]?.id ?? null)
    );
  }, [requestedEntryId, selectedDateEntries]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedEntryId) ?? null,
    [entries, selectedEntryId]
  );
  const selectedOccurrence =
    selectedEntry?.metadata.kind === 'event' ? selectedEntry.metadata.occurrence : null;
  const selectedAppointment =
    selectedEntry?.metadata.kind === 'appointment' ? selectedEntry.metadata.appointment : null;
  const selectedSlot = selectedEntry?.metadata.kind === 'slot' ? selectedEntry.metadata.slot : null;

  const selectedOccurrenceLabel =
    selectedOccurrence &&
    ((selectedOccurrence.occurrence_name &&
      selectedOccurrence.occurrence_name !== selectedOccurrence.event_name) ||
      (selectedOccurrence.occurrence_index ?? 1) > 1)
      ? getEventOccurrenceLabel(selectedOccurrence, selectedOccurrence.occurrence_index ?? 1)
      : null;

  const canUseEventActions =
    selectedOccurrence && !['cancelled', 'completed'].includes(selectedOccurrence.status);
  const activeFilterCount =
    (appliedSearch ? 1 : 0) +
    (selectedEventType ? 1 : 0) +
    (selectedStatus ? 1 : 0) +
    (isAdmin && selectedScope !== 'events' ? 1 : 0);

  const handleMonthRangeChange = useCallback((range: { startDate: string; endDate: string }) => {
    setVisibleRange(range);
  }, []);

  const handleVisibleMonthChange = useCallback(
    (nextMonth: Date) => {
      const nextSelectedDate = getVisibleMonthDate(nextMonth, selectedDate);

      writeSearchParams({
        entry: null,
        month: formatMonthParam(nextMonth),
        date: formatDateParam(nextSelectedDate),
      });
    },
    [selectedDate, writeSearchParams]
  );

  const handleSelectDate = useCallback(
    (date: Date) => {
      writeSearchParams({
        entry: null,
        month: formatMonthParam(date),
        date: formatDateParam(date),
      });
    },
    [writeSearchParams]
  );

  const handleSelectEntry = useCallback(
    (entry: StaffCalendarEntry) => {
      const entryDate = parseValidIsoDate(entry.start);
      if (!entryDate) {
        return;
      }

      setSelectedEntryId(entry.id);
      writeSearchParams({
        entry: entry.id,
        month: formatMonthParam(entryDate),
        date: formatDateParam(entryDate),
      });
    },
    [writeSearchParams]
  );

  const handleTypeChange = useCallback(
    (value: string) => {
      writeSearchParams({ type: value || null });
    },
    [writeSearchParams]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      writeSearchParams({ status: value || null });
    },
    [writeSearchParams]
  );

  const handleScopeChange = useCallback(
    (value: CalendarScope) => {
      writeSearchParams({ scope: value });
    },
    [writeSearchParams]
  );

  const refreshVisibleRange = useCallback(async () => {
    if (!visibleRange) {
      return;
    }

    await loadCalendar({
      range: visibleRange,
      scope: selectedScope,
      search: appliedSearch,
      eventType: selectedEventType,
      status: selectedStatus,
    });
  }, [appliedSearch, loadCalendar, selectedEventType, selectedScope, selectedStatus, visibleRange]);

  const handleConfirmAppointment = useCallback(
    async (appointmentId: string) => {
      setSavingEntryId(`appointment:${appointmentId}`);
      try {
        await portalAdminAppointmentsApiClient.updateAppointmentStatus(appointmentId, {
          status: 'confirmed',
        });
        showSuccess('Appointment confirmed.');
        await refreshVisibleRange();
      } catch (requestError) {
        showError(formatApiErrorMessage(requestError, 'Could not confirm this appointment.'));
      } finally {
        setSavingEntryId(null);
      }
    },
    [refreshVisibleRange, showError, showSuccess]
  );

  const handleCheckInAppointment = useCallback(
    async (appointment: PortalAdminAppointmentInboxItem) => {
      if (appointment.case_id) {
        navigate(`/cases/${appointment.case_id}?tab=appointments`);
        return;
      }

      setSavingEntryId(`appointment:${appointment.id}`);
      try {
        await portalAdminAppointmentsApiClient.checkInAppointment(appointment.id);
        showSuccess('Appointment checked in.');
        await refreshVisibleRange();
      } catch (requestError) {
        showError(formatApiErrorMessage(requestError, 'Could not check in this appointment.'));
      } finally {
        setSavingEntryId(null);
      }
    },
    [navigate, refreshVisibleRange, showError, showSuccess]
  );

  const handleCancelAppointment = useCallback(
    async (appointment: PortalAdminAppointmentInboxItem) => {
      if (appointment.case_id) {
        navigate(`/cases/${appointment.case_id}?tab=appointments`);
        return;
      }

      const confirmed = await confirm({
        title: 'Cancel appointment',
        message: 'Are you sure you want to cancel this appointment?',
        confirmLabel: 'Cancel appointment',
        variant: 'warning',
      });
      if (!confirmed) {
        return;
      }

      setSavingEntryId(`appointment:${appointment.id}`);
      try {
        await portalAdminAppointmentsApiClient.updateAppointmentStatus(appointment.id, {
          status: 'cancelled',
        });
        showSuccess('Appointment canceled.');
        await refreshVisibleRange();
      } catch (requestError) {
        showError(formatApiErrorMessage(requestError, 'Could not cancel this appointment.'));
      } finally {
        setSavingEntryId(null);
      }
    },
    [confirm, navigate, refreshVisibleRange, showError, showSuccess]
  );

  const handleToggleSlotStatus = useCallback(
    async (slot: PortalAppointmentSlot) => {
      const nextStatus = slot.status === 'open' ? 'closed' : 'open';
      setSavingEntryId(`slot:${slot.id}`);
      try {
        await portalAdminAppointmentsApiClient.updateSlotStatus(slot.id, nextStatus);
        showSuccess(`Slot ${nextStatus}.`);
        await refreshVisibleRange();
      } catch (requestError) {
        showError(formatApiErrorMessage(requestError, 'Could not update this slot.'));
      } finally {
        setSavingEntryId(null);
      }
    },
    [refreshVisibleRange, showError, showSuccess]
  );

  const handleManageSlots = useCallback(() => {
    navigate('/settings/admin/portal/slots');
  }, [navigate]);

  const clearFilters = useCallback(() => {
    writeSearchParams({
      search: null,
      type: null,
      status: null,
      scope: isAdmin ? 'events' : null,
    });
  }, [isAdmin, writeSearchParams]);

  return {
    dialogState,
    handleCancel,
    handleConfirm,
    isAdmin,
    visibleMonth,
    selectedDate,
    selectedDateEntries,
    entries,
    selectedEntryId,
    selectedEntry,
    selectedOccurrence,
    selectedAppointment,
    selectedSlot,
    selectedOccurrenceLabel,
    searchInput,
    selectedEventType,
    selectedStatus,
    selectedScope,
    activeFilterCount,
    loading,
    calendarLoading,
    error,
    savingEntryId,
    canUseEventActions: Boolean(canUseEventActions),
    setSearchInput,
    handleMonthRangeChange,
    handleVisibleMonthChange,
    handleSelectDate,
    handleSelectEntry,
    handleTypeChange,
    handleStatusChange,
    handleScopeChange,
    clearFilters,
    handleConfirmAppointment,
    handleCheckInAppointment,
    handleCancelAppointment,
    handleToggleSlotStatus,
    handleManageSlots,
    refreshVisibleRange,
  };
}
