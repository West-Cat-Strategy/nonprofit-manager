import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import CaseDetailTabs from '../CaseDetailTabs';

const tabs = [
  { key: 'notes', label: 'Notes' },
  { key: 'documents', label: 'Documents' },
  { key: 'services', label: 'Services' },
];

describe('CaseDetailTabs', () => {
  it('uses roving keyboard behavior for tab navigation', async () => {
    const onTabChange = vi.fn();

    const { rerender } = render(
      <CaseDetailTabs tabs={tabs} activeTab="notes" onTabChange={onTabChange} />
    );

    const notes = screen.getByRole('tab', { name: 'Notes' });
    const documents = screen.getByRole('tab', { name: 'Documents' });

    expect(notes).toHaveAttribute('tabindex', '0');
    expect(documents).toHaveAttribute('tabindex', '-1');

    notes.focus();
    fireEvent.keyDown(notes, { key: 'ArrowRight' });

    expect(onTabChange).toHaveBeenCalledWith('documents');
    rerender(<CaseDetailTabs tabs={tabs} activeTab="documents" onTabChange={onTabChange} />);

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Documents' })).toHaveFocus());
    expect(screen.getByRole('tab', { name: 'Documents' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Notes' })).toHaveAttribute('tabindex', '-1');

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Documents' }), { key: 'End' });
    expect(onTabChange).toHaveBeenLastCalledWith('services');
    rerender(<CaseDetailTabs tabs={tabs} activeTab="services" onTabChange={onTabChange} />);

    await waitFor(() => expect(screen.getByRole('tab', { name: 'Services' })).toHaveFocus());
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Services' }), { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenLastCalledWith('notes');
  });
});
