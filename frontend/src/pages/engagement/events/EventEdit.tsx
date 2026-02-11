/**
 * EventEdit Component
 * Page for editing existing events
 */

import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchEventById, updateEvent, clearSelectedEvent } from '../../../store/slices/eventsSlice';
import type { UpdateEventDTO } from '../../../types/event';
import EventForm from '../../../components/EventForm';
import NeoBrutalistLayout from '../../../components/neo-brutalist/NeoBrutalistLayout';

const EventEdit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { selectedEvent: event, loading } = useAppSelector((state) => state.events);

  useEffect(() => {
    if (id) {
      dispatch(fetchEventById(id));
    }

    return () => {
      dispatch(clearSelectedEvent());
    };
  }, [id, dispatch]);

  const handleSubmit = async (eventData: UpdateEventDTO) => {
    if (id) {
      await dispatch(updateEvent({ eventId: id, eventData })).unwrap();
    }
  };

  if (loading || !event) {
    return (
      <NeoBrutalistLayout pageTitle="EVENTS">
        <div className="p-6 text-center">Loading event...</div>
      </NeoBrutalistLayout>
    );
  }

  return (
    <NeoBrutalistLayout pageTitle="EVENTS">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Edit Event</h1>
        <EventForm event={event} onSubmit={handleSubmit} isEdit />
      </div>
    </NeoBrutalistLayout>
  );
};

export default EventEdit;
