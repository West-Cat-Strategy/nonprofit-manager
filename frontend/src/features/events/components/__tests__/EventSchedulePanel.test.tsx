import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EventSchedulePanel from '../EventSchedulePanel';
import type { Event } from '../../../../types/event';

const baseEvent: Event = {
  event_id: 'event-1',
  event_name: 'Community clinic',
  description: null,
  event_type: 'community',
  status: 'planned',
  is_public: false,
  is_recurring: false,
  recurrence_pattern: null,
  recurrence_interval: null,
  recurrence_end_date: null,
  start_date: '2026-06-01T18:00:00.000Z',
  end_date: '2026-06-01T20:00:00.000Z',
  occurrence_count: 1,
  location_name: 'Community Hall',
  address_line1: null,
  address_line2: null,
  city: 'Vancouver',
  state_province: 'BC',
  postal_code: null,
  country: 'Canada',
  capacity: 50,
  registered_count: 3,
  attended_count: 0,
  created_at: '2026-04-01T12:00:00.000Z',
  updated_at: '2026-04-01T12:00:00.000Z',
  created_by: 'user-1',
  modified_by: 'user-1',
};

describe('EventSchedulePanel', () => {
  it('keeps the scope controls occurrence-only for single-date events', () => {
    render(
      <EventSchedulePanel
        event={baseEvent}
        selectedOccurrenceId={null}
        batchScope="occurrence"
        supportsBatchScope={false}
        onSelectOccurrence={vi.fn()}
        onChangeBatchScope={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /this occurrence/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /whole series/i })).not.toBeInTheDocument();
    expect(screen.getByText(/scheduled date for this event/i)).toBeInTheDocument();
  });

  it('keeps future and series scopes available for recurring events', () => {
    render(
      <EventSchedulePanel
        event={{
          ...baseEvent,
          is_recurring: true,
          occurrence_count: 2,
          occurrences: [
            {
              occurrence_id: 'occ-1',
              event_id: 'event-1',
              start_date: '2026-06-01T18:00:00.000Z',
              end_date: '2026-06-01T20:00:00.000Z',
              status: 'planned',
              capacity: 50,
              registered_count: 3,
              attended_count: 0,
              location_name: 'Community Hall',
              address_line1: null,
              address_line2: null,
              city: 'Vancouver',
              state_province: 'BC',
              postal_code: null,
              country: 'Canada',
            },
            {
              occurrence_id: 'occ-2',
              event_id: 'event-1',
              start_date: '2026-06-08T18:00:00.000Z',
              end_date: '2026-06-08T20:00:00.000Z',
              status: 'planned',
              capacity: 50,
              registered_count: 2,
              attended_count: 0,
              location_name: 'Community Hall',
              address_line1: null,
              address_line2: null,
              city: 'Vancouver',
              state_province: 'BC',
              postal_code: null,
              country: 'Canada',
            },
          ],
        }}
        selectedOccurrenceId={null}
        batchScope="occurrence"
        supportsBatchScope
        onSelectOccurrence={vi.fn()}
        onChangeBatchScope={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /this occurrence/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /whole series/i })).toBeInTheDocument();
    expect(screen.getByText(/planned occurrences for this series/i)).toBeInTheDocument();
  });
});
