import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import FieldSelector from '../FieldSelector';
import reportsReducer from '../../store/slices/reportsSlice';
import type { ReportEntity } from '../../types/report';
import api from '../../services/api';

// Mock API
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockApi = api as { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };

// Create a test store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      reports: reportsReducer,
    },
    preloadedState: initialState,
  });
};

// Wrapper component
const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  return render(<Provider store={store}>{component}</Provider>);
};

describe('FieldSelector', () => {
  const mockOnChange = vi.fn();
  const mockFields = [
    { name: 'id', type: 'string' },
    { name: 'name', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'created_at', type: 'date' },
  ];

  beforeEach(() => {
    mockOnChange.mockClear();
    // Mock API to return fields
    mockApi.get.mockResolvedValue({ data: mockFields });
  });

  it('renders loading state', () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: null, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: true,
        error: null,
      },
    };

    renderWithProviders(
      <FieldSelector entity="contacts" selectedFields={[]} onChange={mockOnChange} />,
      initialState
    );

    // Check for loading spinner element
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
  });

  it('renders fields as checkboxes', async () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderWithProviders(
      <FieldSelector entity="contacts" selectedFields={[]} onChange={mockOnChange} />,
      initialState
    );

    // Wait for async updates to complete
    await waitFor(() => {
      expect(screen.getByLabelText(/id/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('shows selected fields count', async () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderWithProviders(
      <FieldSelector entity="contacts" selectedFields={['name', 'email']} onChange={mockOnChange} />,
      initialState
    );

    await waitFor(() => {
      expect(screen.getByText(/2 of 4 fields selected/i)).toBeInTheDocument();
    });
  });

  it('selects field when checkbox is clicked', async () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderWithProviders(
      <FieldSelector entity="contacts" selectedFields={[]} onChange={mockOnChange} />,
      initialState
    );

    const nameCheckbox = await waitFor(() => screen.getByLabelText(/name/i));
    fireEvent.click(nameCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith(['name']);
  });

  it('deselects field when already selected checkbox is clicked', async () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderWithProviders(
      <FieldSelector entity="contacts" selectedFields={['name', 'email']} onChange={mockOnChange} />,
      initialState
    );

    const nameCheckbox = await waitFor(() => screen.getByLabelText(/name/i));
    fireEvent.click(nameCheckbox);

    expect(mockOnChange).toHaveBeenCalledWith(['email']);
  });

  it('selects all fields when Select All button is clicked', async () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderWithProviders(
      <FieldSelector entity="contacts" selectedFields={[]} onChange={mockOnChange} />,
      initialState
    );

    const selectAllButton = await waitFor(() => screen.getByRole('button', { name: /select all/i }));
    fireEvent.click(selectAllButton);

    expect(mockOnChange).toHaveBeenCalledWith(['id', 'name', 'email', 'created_at']);
  });

  it('clears all fields when Clear All button is clicked', async () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: mockFields, accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderWithProviders(
      <FieldSelector entity="contacts" selectedFields={['name', 'email']} onChange={mockOnChange} />,
      initialState
    );

    const clearAllButton = await waitFor(() => screen.getByRole('button', { name: /clear all/i }));
    fireEvent.click(clearAllButton);

    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('shows empty state when no fields available', async () => {
    const initialState = {
      reports: {
        currentReport: null,
        availableFields: { contacts: [], accounts: null, donations: null, events: null, volunteers: null, tasks: null },
        loading: false,
        fieldsLoading: false,
        error: null,
      },
    };

    renderWithProviders(
      <FieldSelector entity="contacts" selectedFields={[]} onChange={mockOnChange} />,
      initialState
    );

    await waitFor(() => {
      expect(screen.getByText(/no fields available/i)).toBeInTheDocument();
    });
  });
});
