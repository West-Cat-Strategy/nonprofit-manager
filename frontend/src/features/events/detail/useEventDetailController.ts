import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { getUserTimezoneCached } from '../../../services/userPreferencesService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchEventDetailV2 } from '../state';
import { clearEventDetailV2 } from '../state/eventDetailSlice';
import { getBrowserTimeZone } from '../utils/reminderTime';
import useEventScheduleState from '../scheduling/useEventScheduleState';
import useEventRegistrationsSectionController from '../registrations/useEventRegistrationsSectionController';

export default function useEventDetailController() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const detailState = useAppSelector((state) => state.events.detail);
  const [organizationTimezone, setOrganizationTimezone] = useState(getBrowserTimeZone());

  const event = detailState.event;
  const {
    activeTab,
    batchScope,
    calendarEvent,
    eventOccurrences,
    handleSelectOccurrence,
    handleSelectTab,
    selectedOccurrence,
    setBatchScope,
  } = useEventScheduleState({ event });

  const metaDescription =
    selectedOccurrence && event
      ? `${event.event_name} · ${selectedOccurrence.occurrence_name ?? 'Selected occurrence'}`
      : event?.description
        ? event.description
        : event?.event_name
          ? `Join us for ${event.event_name}`
          : undefined;

  useDocumentMeta({
    title: event?.event_name,
    description: metaDescription,
    url: `/events/${id}`,
    type: 'event',
  });

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
    if (!id) {
      return;
    }

    dispatch(fetchEventDetailV2(id));

    return () => {
      dispatch(clearEventDetailV2());
    };
  }, [dispatch, id]);

  const registrations = useEventRegistrationsSectionController({
    activeTab,
    eventId: id ?? null,
    eventOccurrences,
    selectedOccurrence,
  });

  return {
    activeTab,
    batchScope,
    calendarEvent,
    detailState,
    event,
    eventOccurrences,
    handleSelectOccurrence,
    handleSelectTab,
    navigateToCalendar: () => navigate('/events/calendar'),
    navigateToEdit: () => {
      if (event) {
        navigate(`/events/${event.event_id}/edit`);
      }
    },
    organizationTimezone,
    registrations,
    selectedOccurrence,
    setBatchScope,
  };
}
