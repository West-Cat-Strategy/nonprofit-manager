/**
 * EventCreate Component
 * Page for creating new events
 */

import React from 'react';
import { useAppDispatch } from '../../../store/hooks';
import { createEvent } from '../../../store/slices/eventsSlice';
import type { CreateEventDTO, UpdateEventDTO } from '../../../types/event';
import EventForm from '../../../components/EventForm';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';

const EventCreate: React.FC = () => {
  const dispatch = useAppDispatch();

  const handleSubmit = async (eventData: CreateEventDTO | UpdateEventDTO) => {
    return dispatch(createEvent(eventData as CreateEventDTO)).unwrap();
  };

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Create New Event</h1>
        <EventForm onSubmit={handleSubmit} />
      </div>
    </NeoBrutalistLayout>
  );
};

export default EventCreate;
