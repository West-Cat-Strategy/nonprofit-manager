import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PropertyPanel from '../PropertyPanel';

describe('PropertyPanel event-list controls', () => {
  it('updates event-list properties through dedicated controls', () => {
    const onUpdateComponent = vi.fn();

    const { container } = render(
      <PropertyPanel
        selectedComponent={{
          id: 'event-list-1',
          type: 'event-list',
          maxEvents: 6,
          showPastEvents: false,
          layout: 'grid',
        }}
        selectedSection={null}
        onUpdateComponent={onUpdateComponent}
        onUpdateSection={vi.fn()}
        onDeleteComponent={vi.fn()}
        onDeleteSection={vi.fn()}
      />
    );

    const maxEventsInput = container.querySelector('input[type="number"]') as HTMLInputElement;
    const selects = container.querySelectorAll('select');
    const eventTypeSelect = selects[1] as HTMLSelectElement;
    const showPastEventsCheckbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement;

    fireEvent.change(maxEventsInput, {
      target: { value: '8' },
    });

    expect(onUpdateComponent).toHaveBeenCalledWith('event-list-1', { maxEvents: 8 });

    fireEvent.change(eventTypeSelect, {
      target: { value: 'fundraiser' },
    });

    expect(onUpdateComponent).toHaveBeenCalledWith('event-list-1', {
      eventType: 'fundraiser',
      filterByTag: 'fundraiser',
    });

    fireEvent.click(showPastEventsCheckbox);

    expect(onUpdateComponent).toHaveBeenCalledWith('event-list-1', {
      showPastEvents: true,
    });
  });
});

describe('PropertyPanel referral-form controls', () => {
  it('updates referral-form behavior through dedicated form controls', () => {
    const onUpdateComponent = vi.fn();

    const { container } = render(
      <PropertyPanel
        selectedComponent={{
          id: 'referral-form-1',
          type: 'referral-form',
          heading: 'Send a referral',
          description: 'Tell us who needs support.',
          submitText: 'Submit Referral',
          includePhone: true,
          successMessage: 'Referral received.',
          defaultTags: ['intake'],
          accountId: 'account-1',
        }}
        selectedSection={null}
        onUpdateComponent={onUpdateComponent}
        onUpdateSection={vi.fn()}
        onDeleteComponent={vi.fn()}
        onDeleteSection={vi.fn()}
      />
    );

    expect(screen.getByText('Default Tags')).toBeInTheDocument();
    expect(screen.getByText('Account ID')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('Submit Referral'), {
      target: { value: 'Send Referral' },
    });

    expect(onUpdateComponent).toHaveBeenCalledWith('referral-form-1', {
      submitText: 'Send Referral',
    });

    fireEvent.click(screen.getByLabelText('Include phone field'));

    expect(onUpdateComponent).toHaveBeenCalledWith('referral-form-1', {
      includePhone: false,
    });

    const defaultTagsInput = container.querySelector(
      'input[placeholder="intake, referral"]'
    ) as HTMLInputElement;
    fireEvent.change(defaultTagsInput, {
      target: { value: 'intake, urgent referral' },
    });

    expect(onUpdateComponent).toHaveBeenCalledWith('referral-form-1', {
      defaultTags: ['intake', 'urgent referral'],
    });
  });
});
