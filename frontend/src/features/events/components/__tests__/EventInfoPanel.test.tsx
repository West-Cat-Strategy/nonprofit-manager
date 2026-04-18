import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Event, EventOccurrence } from '../../../../types/event';
import EventInfoPanel from '../EventInfoPanel';

const baseEvent: Event = {
  event_id: 'event-1',
  event_name: 'Community clinic',
  description: 'Recurring support clinic.',
  event_type: 'community',
  status: 'planned',
  is_public: false,
  is_recurring: true,
  recurrence_pattern: 'week',
  recurrence_interval: 1,
  recurrence_end_date: '2026-06-30T20:00:00.000Z',
  start_date: '2026-06-01T18:00:00.000Z',
  end_date: '2026-06-01T20:00:00.000Z',
  occurrence_count: 2,
  location_name: 'Community Hall',
  address_line1: null,
  address_line2: null,
  city: 'Vancouver',
  state_province: 'BC',
  postal_code: null,
  country: 'Canada',
  capacity: 50,
  registered_count: 10,
  attended_count: 4,
  created_at: '2026-04-01T12:00:00.000Z',
  updated_at: '2026-04-01T12:00:00.000Z',
  created_by: 'user-1',
  modified_by: 'user-1',
};

const selectedOccurrence: EventOccurrence = {
  occurrence_id: 'occ-2',
  event_id: 'event-1',
  series_id: 'event-1',
  occurrence_index: 2,
  occurrence_name: 'Afternoon clinic',
  start_date: '2026-06-08T21:00:00.000Z',
  end_date: '2026-06-08T23:00:00.000Z',
  status: 'planned',
  capacity: 20,
  registered_count: 7,
  attended_count: 3,
  location_name: 'Annex Room',
  address_line1: '22 Side St',
  address_line2: null,
  city: 'Burnaby',
  state_province: 'BC',
  postal_code: 'V5H 1A1',
  country: 'Canada',
  is_primary: false,
  is_exception: false,
  is_cancelled: false,
};

describe('EventInfoPanel', () => {
  it('renders the selected occurrence timing and metrics in recurring event overviews', () => {
    render(
      <EventInfoPanel
        event={baseEvent}
        occurrences={[
          {
            ...selectedOccurrence,
            occurrence_id: 'occ-1',
            occurrence_index: 1,
            occurrence_name: 'Morning clinic',
            start_date: '2026-06-01T18:00:00.000Z',
            end_date: '2026-06-01T20:00:00.000Z',
            location_name: 'Community Hall',
            city: 'Vancouver',
            postal_code: null,
          },
          selectedOccurrence,
        ]}
        selectedOccurrence={selectedOccurrence}
      />
    );

    expect(screen.getByRole('heading', { name: 'Selected Start' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Selected End' })).toBeInTheDocument();
    expect(screen.getByText(/annex room/i)).toBeInTheDocument();
    expect(screen.getByText(/^7$/)).toBeInTheDocument();
    expect(screen.getByText(/^3$/)).toBeInTheDocument();
    expect(screen.getByText(/% full for the selected occurrence/i)).toBeInTheDocument();
    expect(screen.getByText(/^For the selected occurrence$/i)).toBeInTheDocument();
    expect(screen.getByText(/checked in for the selected occurrence/i)).toBeInTheDocument();
  });
});
