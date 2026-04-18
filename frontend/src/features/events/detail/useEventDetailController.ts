import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useDocumentMeta } from '../../../hooks/useDocumentMeta';
import { getUserTimezoneCached } from '../../../services/userPreferencesService';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchEventDetailV2 } from '../state';
import { clearEventDetailV2 } from '../state/eventDetailSlice';
import {
  buildCurrentEventRouteTarget,
  createEventEditTarget,
  resolveEventReturnTarget,
  resolveEventWorkspaceTarget,
} from '../navigation/eventRouteTargets';
import { getBrowserTimeZone } from '../utils/reminderTime';
import useEventScheduleState from '../scheduling/useEventScheduleState';
import useEventRegistrationsSectionController from '../registrations/useEventRegistrationsSectionController';

export default function useEventDetailController() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
    supportsBatchScope,
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

  const currentDetailTarget = buildCurrentEventRouteTarget(location.pathname, location.search);
  const returnTarget = resolveEventReturnTarget(searchParams.get('return_to'), '/events');
  const calendarTarget = resolveEventWorkspaceTarget(searchParams.get('return_to'), '/events/calendar');
  const editTarget = event
    ? createEventEditTarget(event.event_id, {
        occurrenceId: selectedOccurrence?.occurrence_id ?? searchParams.get('occurrence'),
        returnTo: location.search ? currentDetailTarget : null,
      })
    : null;

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
    calendarTarget,
    editTarget,
    returnTarget,
    navigateToCalendar: () => navigate(calendarTarget),
    navigateToEdit: () => {
      if (editTarget) {
        navigate(editTarget);
      }
    },
    organizationTimezone,
    registrations,
    selectedOccurrence,
    setBatchScope,
    supportsBatchScope,
  };
}
