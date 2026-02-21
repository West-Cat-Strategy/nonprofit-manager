import type { CreateEventDTO, UpdateEventDTO } from '../../../types/event';
import EventForm from '../../../components/EventForm';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';
import { useAppDispatch } from '../../../store/hooks';
import { createEventV2 } from '../state';

export default function EventCreatePage() {
  const dispatch = useAppDispatch();

  const handleSubmit = async (eventData: CreateEventDTO | UpdateEventDTO) => {
    return dispatch(createEventV2(eventData as CreateEventDTO)).unwrap();
  };

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
      <div className="p-6">
        <h1 className="mb-6 text-3xl font-bold">Create New Event</h1>
        <EventForm onSubmit={handleSubmit} />
      </div>
    </NeoBrutalistLayout>
  );
}
