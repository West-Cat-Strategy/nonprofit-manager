import { useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import type { UpdateEventDTO } from '../../../types/event';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import EventEditorForm from './EventEditorForm';
import StaffEventsPageShell, {
  staffEventsMetadataBadgeClassName,
  staffEventsSecondaryActionClassName,
} from '../components/StaffEventsPageShell';
import {
  createEventDetailTarget,
  isEventDetailTarget,
  isEventWorkspaceTarget,
  resolveEventReturnTarget,
  resolveEventWorkspaceTarget,
} from '../navigation/eventRouteTargets';
import { clearEventDetailV2, fetchEventDetailV2, updateEventV2 } from '../state';

export default function EventEditView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const detailState = useAppSelector((state) => state.events.detail);
  const occurrenceId = searchParams.get('occurrence');
  const returnTarget = resolveEventReturnTarget(searchParams.get('return_to'), '/events');
  const calendarTarget = resolveEventWorkspaceTarget(searchParams.get('return_to'), '/events/calendar');
  const backLabel = isEventDetailTarget(returnTarget, id)
    ? 'Back to details'
    : isEventWorkspaceTarget(returnTarget)
      ? 'Back to events'
      : 'Back';

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

  const detailTarget =
    detailState.event && isEventDetailTarget(returnTarget, detailState.event.event_id)
      ? returnTarget
      : detailState.event
        ? createEventDetailTarget(detailState.event.event_id, {
            occurrenceId,
            returnTo: isEventWorkspaceTarget(returnTarget) ? returnTarget : null,
          })
        : null;

  if (detailState.loading) {
    return (
      <StaffEventsPageShell
        title="Edit event"
        description="Loading the latest event details so you can update this schedule safely."
        backHref={returnTarget}
        backLabel={backLabel}
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
        backHref={returnTarget}
        backLabel={backLabel}
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
      backHref={returnTarget}
      backLabel={backLabel}
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
          <Link to={calendarTarget} className={staffEventsSecondaryActionClassName}>
            Back to calendar
          </Link>
          {detailTarget ? (
            <Link to={detailTarget} className={staffEventsSecondaryActionClassName}>
              View details
            </Link>
          ) : null}
        </>
      }
    >
      <EventEditorForm event={detailState.event} onSubmit={handleSubmit} isEdit />
    </StaffEventsPageShell>
  );
}
