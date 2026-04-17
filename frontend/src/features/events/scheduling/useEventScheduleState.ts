import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Event, EventBatchScope } from '../../../types/event';
import { buildEventOccurrences, getEventOccurrenceById } from '../utils/occurrences';

export type EventDetailTab = 'overview' | 'schedule' | 'registrations';

interface UseEventScheduleStateArgs {
  event: Event | null;
}

interface UseEventScheduleStateResult {
  activeTab: EventDetailTab;
  batchScope: EventBatchScope;
  calendarEvent: Event | null;
  eventOccurrences: ReturnType<typeof buildEventOccurrences>;
  handleSelectOccurrence: (occurrenceId: string) => void;
  handleSelectTab: (tab: EventDetailTab) => void;
  selectedOccurrence: ReturnType<typeof getEventOccurrenceById>;
  setBatchScope: Dispatch<SetStateAction<EventBatchScope>>;
}

const VALID_DETAIL_TABS: EventDetailTab[] = ['overview', 'schedule', 'registrations'];

const isEventDetailTab = (value: string | null): value is EventDetailTab =>
  value !== null && VALID_DETAIL_TABS.includes(value as EventDetailTab);

export default function useEventScheduleState({
  event,
}: UseEventScheduleStateArgs): UseEventScheduleStateResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<EventDetailTab>('overview');
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null);
  const [batchScope, setBatchScope] = useState<EventBatchScope>('occurrence');

  const eventOccurrences = useMemo(() => buildEventOccurrences(event), [event]);
  const selectedOccurrence = useMemo(
    () => getEventOccurrenceById(eventOccurrences, selectedOccurrenceId),
    [eventOccurrences, selectedOccurrenceId]
  );

  const calendarEvent = useMemo<Event | null>(() => {
    if (!event) {
      return null;
    }

    if (!selectedOccurrence) {
      return event;
    }

    const occurrenceLabel =
      selectedOccurrence.occurrence_name && selectedOccurrence.occurrence_name !== event.event_name
        ? `${event.event_name} · ${selectedOccurrence.occurrence_name}`
        : event.event_name;

    return {
      ...event,
      occurrence_id: selectedOccurrence.occurrence_id,
      event_name: occurrenceLabel,
      start_date: selectedOccurrence.start_date,
      end_date: selectedOccurrence.end_date,
      location_name: selectedOccurrence.location_name ?? event.location_name,
      address_line1: selectedOccurrence.address_line1 ?? event.address_line1,
      address_line2: selectedOccurrence.address_line2 ?? event.address_line2,
      city: selectedOccurrence.city ?? event.city,
      state_province: selectedOccurrence.state_province ?? event.state_province,
      postal_code: selectedOccurrence.postal_code ?? event.postal_code,
      country: selectedOccurrence.country ?? event.country,
      next_occurrence_id: selectedOccurrence.occurrence_id,
    };
  }, [event, selectedOccurrence]);

  useEffect(() => {
    setSelectedOccurrenceId(null);
    setBatchScope('occurrence');
  }, [event?.event_id]);

  useEffect(() => {
    if (!eventOccurrences.length) {
      setSelectedOccurrenceId(null);
      return;
    }

    const nextSelected =
      eventOccurrences.find((occurrence) => occurrence.occurrence_id === selectedOccurrenceId) ??
      (event?.next_occurrence_id
        ? eventOccurrences.find(
            (occurrence) => occurrence.occurrence_id === event.next_occurrence_id
          )
        : null) ??
      eventOccurrences[0];

    if (nextSelected && nextSelected.occurrence_id !== selectedOccurrenceId) {
      setSelectedOccurrenceId(nextSelected.occurrence_id);
    }
  }, [event?.next_occurrence_id, eventOccurrences, selectedOccurrenceId]);

  useEffect(() => {
    const requestedOccurrenceId = searchParams.get('occurrence');
    if (
      !requestedOccurrenceId ||
      !eventOccurrences.some((occurrence) => occurrence.occurrence_id === requestedOccurrenceId)
    ) {
      return;
    }

    if (requestedOccurrenceId !== selectedOccurrenceId) {
      setSelectedOccurrenceId(requestedOccurrenceId);
    }
  }, [eventOccurrences, searchParams, selectedOccurrenceId]);

  useEffect(() => {
    const requestedTab = searchParams.get('tab');
    if (isEventDetailTab(requestedTab) && requestedTab !== activeTab) {
      setActiveTab(requestedTab);
    }
  }, [activeTab, searchParams]);

  const writeDetailSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams);

      for (const [key, value] of Object.entries(updates)) {
        if (!value) {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }

      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const handleSelectTab = useCallback(
    (tab: EventDetailTab) => {
      setActiveTab(tab);
      writeDetailSearchParams({ tab });
    },
    [writeDetailSearchParams]
  );

  const handleSelectOccurrence = useCallback(
    (occurrenceId: string) => {
      setSelectedOccurrenceId(occurrenceId);
      writeDetailSearchParams({ occurrence: occurrenceId });
    },
    [writeDetailSearchParams]
  );

  return {
    activeTab,
    batchScope,
    calendarEvent,
    eventOccurrences,
    handleSelectOccurrence,
    handleSelectTab,
    selectedOccurrence,
    setBatchScope,
  };
}
