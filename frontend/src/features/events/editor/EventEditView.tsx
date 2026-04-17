import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { UpdateEventDTO } from '../../../types/event';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import EventEditorForm from './EventEditorForm';
import StaffEventsPageShell, {
  staffEventsMetadataBadgeClassName,
  staffEventsSecondaryActionClassName,
} from '../components/StaffEventsPageShell';
import { clearEventDetailV2, fetchEventDetailV2, updateEventV2 } from '../state';

export default function EventEditView() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const detailState = useAppSelector((state) => state.events.detail);

  useEffect(() => {
    if (id) {
      dispatch(fetchEventDetailV2(id));
    }

    return () => {
      dispatch(clearEventDetailV2());
    };
  }, [dispatch, id]);

  const handleSubmit = async (eventData: UpdateEventDTO) => {
    if (!id) {
      return undefined;
    }

    return dispatch(updateEventV2({ eventId: id, eventData })).unwrap();
  };

  if (detailState.loading) {
    return (
      <StaffEventsPageShell
        title="Edit event"
        description="Loading the latest event details so you can update this schedule safely."
        backHref="/events"
        backLabel="Back to events"
      >
        <div className="rounded-xl border border-app-border bg-app-surface p-6 text-sm text-app-text-muted shadow-sm">
          Loading event...
        </div>
      </StaffEventsPageShell>
    );
  }

  if (!detailState.event) {
    return (
      <StaffEventsPageShell
        title="Edit event"
        description="This event could not be loaded right now."
        backHref="/events"
        backLabel="Back to events"
      >
        <div className="rounded-xl border border-app-border bg-app-accent-soft p-6 text-sm text-app-accent-text shadow-sm">
          We could not load this event. Try reopening it from the events calendar.
        </div>
      </StaffEventsPageShell>
    );
  }

  return (
    <StaffEventsPageShell
      title="Edit event"
      description="Update the timing, access, reminders, and delivery details for this event without changing its saved duration unless you choose to."
      backHref="/events"
      backLabel="Back to events"
      metadata={
        <>
          <span className={staffEventsMetadataBadgeClassName}>{detailState.event.status}</span>
          <span className={staffEventsMetadataBadgeClassName}>
            {detailState.event.is_public ? 'Public' : 'Private'}
          </span>
        </>
      }
      actions={
        <>
          <Link to="/events/calendar" className={staffEventsSecondaryActionClassName}>
            Back to calendar
          </Link>
          <Link
            to={`/events/${detailState.event.event_id}`}
            className={staffEventsSecondaryActionClassName}
          >
            View details
          </Link>
        </>
      }
    >
      <EventEditorForm event={detailState.event} onSubmit={handleSubmit} isEdit />
    </StaffEventsPageShell>
  );
}
