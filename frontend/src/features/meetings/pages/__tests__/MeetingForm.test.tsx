import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MeetingCreatePage from '../MeetingCreatePage';
import MeetingEditPage from '../MeetingEditPage';
import { useMeetingForm } from '../../hooks/useMeetingForm';
import { BrowserRouter } from 'react-router-dom';

// Mock the hook
vi.mock('../../hooks/useMeetingForm', () => ({
  useMeetingForm: vi.fn(),
}));

const mockUseMeetingForm = vi.mocked(useMeetingForm);

describe('Meeting Form Pages', () => {
  it('renders MeetingCreatePage', () => {
    mockUseMeetingForm.mockReturnValue({
      formData: { title: '', meeting_type: 'committee' },
      committees: [{ id: 'c1', name: 'Finance' }],
      loading: false,
      submitting: false,
      handleChange: vi.fn(),
      handleSubmit: vi.fn(),
      onCancel: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingCreatePage />
      </BrowserRouter>
    );

    expect(screen.getByText('Create Meeting', { selector: 'h1' })).toBeDefined();
    expect(screen.getByText('Meeting Title')).toBeDefined();
    expect(screen.getByText('Finance')).toBeDefined();
  });

  it('renders MeetingEditPage', () => {
    mockUseMeetingForm.mockReturnValue({
      formData: { title: 'Existing Meeting', meeting_type: 'board' },
      committees: [{ id: 'c1', name: 'Finance' }],
      loading: false,
      submitting: false,
      handleChange: vi.fn(),
      handleSubmit: vi.fn(),
      onCancel: vi.fn(),
    });

    render(
      <BrowserRouter>
        <MeetingEditPage />
      </BrowserRouter>
    );

    expect(screen.getByText('Edit Meeting')).toBeDefined();
    expect(screen.getByDisplayValue('Existing Meeting')).toBeDefined();
  });
});
