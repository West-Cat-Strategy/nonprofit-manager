import { Link, useSearchParams } from 'react-router-dom';
import type { CreateEventDTO, UpdateEventDTO } from '../../../types/event';
import { useAppDispatch } from '../../../store/hooks';
import EventEditorForm from './EventEditorForm';
import StaffEventsPageShell, {
  staffEventsMetadataBadgeClassName,
  staffEventsSecondaryActionClassName,
} from '../components/StaffEventsPageShell';
import {
  isEventWorkspaceTarget,
  resolveEventReturnTarget,
  resolveEventWorkspaceTarget,
} from '../navigation/eventRouteTargets';
import { createEventV2 } from '../state';

export default function EventCreateView() {
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const returnTarget = resolveEventReturnTarget(searchParams.get('return_to'), '/events');
  const calendarTarget = resolveEventWorkspaceTarget(searchParams.get('return_to'), '/events/calendar');
  const backLabel = isEventWorkspaceTarget(returnTarget) ? 'Back to events' : 'Back';

  const handleSubmit = async (eventData: CreateEventDTO | UpdateEventDTO) => {
    return dispatch(createEventV2(eventData as CreateEventDTO)).unwrap();
  };

  return (
    <StaffEventsPageShell
      title="Create event"
      description="Set the schedule first, then add the details, visibility, reminders, and location for this event."
      backHref={returnTarget}
      backLabel={backLabel}
      metadata={<span className={staffEventsMetadataBadgeClassName}>New event</span>}
      actions={
        <Link to={calendarTarget} className={staffEventsSecondaryActionClassName}>
          Back to calendar
        </Link>
      }
    >
      <EventEditorForm onSubmit={handleSubmit} />
    </StaffEventsPageShell>
  );
}
