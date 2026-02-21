import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { UpdateEventDTO } from '../../../types/event';
import EventForm from '../../../components/EventForm';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { clearEventDetailV2 } from '../state/eventDetailSlice';
import { fetchEventDetailV2 } from '../state/eventDetailSlice';
import { updateEventV2 } from '../state/eventMutationSlice';

export default function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const detailState = useAppSelector((state) => state.eventDetailV2);

  useEffect(() => {
    if (id) {
      dispatch(fetchEventDetailV2(id));
    }

    return () => {
      dispatch(clearEventDetailV2());
    };
  }, [dispatch, id]);

  const handleSubmit = async (eventData: UpdateEventDTO) => {
    if (!id) return undefined;
    return dispatch(updateEventV2({ eventId: id, eventData })).unwrap();
  };

  if (detailState.loading || !detailState.event) {
    return (
      <NeoBrutalistLayout pageTitle="EVENTS">
        <div className="p-6 text-center">Loading event...</div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Edit Event</h1>
        <EventForm event={detailState.event} onSubmit={handleSubmit} isEdit />
      </div>
    </NeoBrutalistLayout>
  );
}
