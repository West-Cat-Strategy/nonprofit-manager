import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import PropertyPanel from '../PropertyPanel';

describe('PropertyPanel event-list controls', () => {
  it('updates event-list properties through dedicated controls', () => {
    const onUpdateComponent = vi.fn();

    render(
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

    const maxEventsInput = screen.getByLabelText('Max Events');
    const layoutSelect = screen.getByLabelText('Layout');
    const eventTypeSelect = screen.getByLabelText('Event Type');
    const showPastEventsCheckbox = screen.getByLabelText('Show past events');

    expect(screen.getByLabelText('Empty Message')).toBeInTheDocument();
    expect(screen.getByLabelText('Site Key (Optional)')).toBeInTheDocument();

    fireEvent.change(maxEventsInput, {
      target: { value: '8' },
    });
    fireEvent.blur(maxEventsInput);

    expect(onUpdateComponent).toHaveBeenCalledWith('event-list-1', { maxEvents: 8 });

    fireEvent.change(layoutSelect, {
      target: { value: 'list' },
    });

    expect(onUpdateComponent).toHaveBeenCalledWith('event-list-1', { layout: 'list' });

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

  it('labels event calendar controls without changing update payloads', () => {
    const onUpdateComponent = vi.fn();

    render(
      <PropertyPanel
        selectedComponent={{
          id: 'event-calendar-1',
          type: 'event-calendar',
          maxEvents: 8,
          initialView: 'month',
          showPastEvents: false,
        }}
        selectedSection={null}
        onUpdateComponent={onUpdateComponent}
        onUpdateSection={vi.fn()}
        onDeleteComponent={vi.fn()}
        onDeleteSection={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('Initial View'), {
      target: { value: 'agenda' },
    });
    fireEvent.change(screen.getByLabelText('Event Type'), {
      target: { value: 'workshop' },
    });
    fireEvent.click(screen.getByLabelText('Show past events'));

    expect(screen.getByLabelText('Max Events')).toBeInTheDocument();
    expect(onUpdateComponent).toHaveBeenCalledWith('event-calendar-1', {
      initialView: 'agenda',
    });
    expect(onUpdateComponent).toHaveBeenCalledWith('event-calendar-1', {
      eventType: 'workshop',
    });
    expect(onUpdateComponent).toHaveBeenCalledWith('event-calendar-1', {
      showPastEvents: true,
    });
  });

  it('labels event detail and registration controls', () => {
    const onUpdateComponent = vi.fn();
    const { rerender } = render(
      <PropertyPanel
        selectedComponent={{
          id: 'event-detail-1',
          type: 'event-detail',
          showDescription: true,
          showLocation: true,
          showCapacity: true,
        }}
        selectedSection={null}
        onUpdateComponent={onUpdateComponent}
        onUpdateSection={vi.fn()}
        onDeleteComponent={vi.fn()}
        onDeleteSection={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText('Show description'));
    fireEvent.click(screen.getByLabelText('Show location'));
    fireEvent.click(screen.getByLabelText('Show capacity'));

    expect(onUpdateComponent).toHaveBeenCalledWith('event-detail-1', {
      showDescription: false,
    });
    expect(onUpdateComponent).toHaveBeenCalledWith('event-detail-1', {
      showLocation: false,
    });
    expect(onUpdateComponent).toHaveBeenCalledWith('event-detail-1', {
      showCapacity: false,
    });

    rerender(
      <PropertyPanel
        selectedComponent={{
          id: 'event-registration-1',
          type: 'event-registration',
          submitText: 'Register',
          defaultStatus: 'registered',
          includePhone: true,
        }}
        selectedSection={null}
        onUpdateComponent={onUpdateComponent}
        onUpdateSection={vi.fn()}
        onDeleteComponent={vi.fn()}
        onDeleteSection={vi.fn()}
      />
    );

    const submitText = screen.getByLabelText('Submit Text');
    fireEvent.change(submitText, { target: { value: 'Join us' } });
    fireEvent.blur(submitText);
    fireEvent.change(screen.getByLabelText('Default Registration Status'), {
      target: { value: 'confirmed' },
    });
    fireEvent.click(screen.getByLabelText('Include phone field'));

    expect(onUpdateComponent).toHaveBeenCalledWith('event-registration-1', {
      submitText: 'Join us',
    });
    expect(onUpdateComponent).toHaveBeenCalledWith('event-registration-1', {
      defaultStatus: 'confirmed',
    });
    expect(onUpdateComponent).toHaveBeenCalledWith('event-registration-1', {
      includePhone: false,
    });
  });
});

describe('PropertyPanel generic style controls', () => {
  it('keeps repeated margin and padding controls label-addressable by group', () => {
    const onUpdateComponent = vi.fn();

    render(
      <PropertyPanel
        selectedComponent={
          {
            id: 'custom-1',
            type: 'custom-section',
            className: 'hero-card',
            margin: { top: '1rem', right: '', bottom: '', left: '' },
            padding: { top: '', right: '', bottom: '', left: '' },
          } as never
        }
        selectedSection={null}
        onUpdateComponent={onUpdateComponent}
        onUpdateSection={vi.fn()}
        onDeleteComponent={vi.fn()}
        onDeleteSection={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText('CSS Class'), {
      target: { value: 'hero-card featured' },
    });
    fireEvent.change(within(screen.getByRole('group', { name: 'Margin' })).getByLabelText('Top'), {
      target: { value: '2rem' },
    });
    fireEvent.change(
      within(screen.getByRole('group', { name: 'Padding' })).getByLabelText('Left'),
      {
        target: { value: '1.5rem' },
      }
    );

    expect(onUpdateComponent).toHaveBeenCalledWith('custom-1', {
      className: 'hero-card featured',
    });
    expect(onUpdateComponent).toHaveBeenCalledWith('custom-1', {
      margin: { top: '2rem', right: '', bottom: '', left: '' },
    });
    expect(onUpdateComponent).toHaveBeenCalledWith('custom-1', {
      padding: { top: '', right: '', bottom: '', left: '1.5rem' },
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

    const submitTextInput = screen.getByDisplayValue('Submit Referral');
    fireEvent.change(submitTextInput, {
      target: { value: 'Send Referral' },
    });
    fireEvent.blur(submitTextInput);

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
    fireEvent.blur(defaultTagsInput);

    expect(onUpdateComponent).toHaveBeenCalledWith('referral-form-1', {
      defaultTags: ['intake', 'urgent referral'],
    });
  });
});
