import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import BookingCalendarView, { type BookingCalendarEntry } from '../BookingCalendarView';

const sampleEntries: BookingCalendarEntry[] = [
  {
    id: 'event:1',
    kind: 'event',
    title: 'Spring Gala',
    start: '2026-05-12T18:00:00.000Z',
    end: '2026-05-12T20:00:00.000Z',
    status: 'planned',
    location: 'Main Hall',
    metadata: null,
  },
];

const malformedEntry: BookingCalendarEntry = {
  id: 'event:invalid',
  kind: 'event',
  title: 'Broken Entry',
  start: 'not-a-date',
  status: 'planned',
  location: 'Main Hall',
  metadata: null,
};

describe('BookingCalendarView', () => {
  it('reports the full visible grid range for the active month', async () => {
    const handleMonthRangeChange = vi.fn();

    render(
      <BookingCalendarView
        entries={[]}
        visibleMonth={new Date('2026-05-01T12:00:00.000Z')}
        onMonthRangeChange={handleMonthRangeChange}
      />
    );

    await waitFor(() => {
      expect(handleMonthRangeChange).toHaveBeenCalledWith({
        startDate: expect.stringMatching(/^2026-04-26/),
        endDate: expect.stringMatching(/^2026-06-07/),
      });
    });
  });

  it('supports selecting an entry and its day from the calendar grid', () => {
    const handleDateSelect = vi.fn();
    const handleEntryClick = vi.fn();

    render(
      <BookingCalendarView
        entries={sampleEntries}
        visibleMonth={new Date('2026-05-01T12:00:00.000Z')}
        selectedDate={new Date('2026-05-12T12:00:00.000Z')}
        onDateSelect={handleDateSelect}
        onEntryClick={handleEntryClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Spring Gala/i }));

    expect(handleEntryClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'event:1' }));
    expect(handleDateSelect).toHaveBeenCalledWith(expect.any(Date));
  });

  it('skips malformed entries instead of rendering or crashing', () => {
    render(
      <BookingCalendarView
        entries={[...sampleEntries, malformedEntry]}
        visibleMonth={new Date('2026-05-01T12:00:00.000Z')}
      />
    );

    expect(screen.getByRole('button', { name: /Spring Gala/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Broken Entry/i })).not.toBeInTheDocument();
  });
});
