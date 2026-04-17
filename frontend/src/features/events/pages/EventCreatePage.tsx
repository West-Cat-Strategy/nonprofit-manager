import { Link } from 'react-router-dom';
import type { CreateEventDTO, UpdateEventDTO } from '../../../types/event';
import { useAppDispatch } from '../../../store/hooks';
import EventEditorForm from '../components/EventEditorForm';
import StaffEventsPageShell, {
  staffEventsMetadataBadgeClassName,
  staffEventsSecondaryActionClassName,
} from '../components/StaffEventsPageShell';
import { createEventV2 } from '../state';

export default function EventCreatePage() {
  const dispatch = useAppDispatch();

  const handleSubmit = async (eventData: CreateEventDTO | UpdateEventDTO) => {
    return dispatch(createEventV2(eventData as CreateEventDTO)).unwrap();
  };

  return (
    <StaffEventsPageShell
      title="Create event"
      description="Set the schedule first, then add the details, visibility, reminders, and location for this event."
      backHref="/events"
      backLabel="Back to events"
      metadata={<span className={staffEventsMetadataBadgeClassName}>New event</span>}
      actions={
        <Link to="/events/calendar" className={staffEventsSecondaryActionClassName}>
          Back to calendar
        </Link>
      }
    >
      <EventEditorForm onSubmit={handleSubmit} />
    </StaffEventsPageShell>
  );
}
